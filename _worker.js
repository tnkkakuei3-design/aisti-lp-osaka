// _worker.js — Cloudflare Workers
// 大阪市マンション査定LP用バックエンド
//
// 機能:
//   POST /api/session → 回答データをKV保存 + GAS Webhook通知 + セッションID返却
//   GET  /api/session?id=xxx → セッションデータ取得（LINE Webhook用・同一オリジンのみ）

// 許可するオリジン（本番ドメインを追加してください）
const ALLOWED_ORIGINS = [
  'https://satei.aisti.jp',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => origin === o) ||
    origin.endsWith('.aisti-lp-osaka.pages.dev');
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

// 簡易レート制限（IPベース、KV使用）
async function checkRateLimit(request, env) {
  if (!env.SESSIONS_KV) return true;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `rl:${ip}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分間
  const maxRequests = 10;     // 1分間に10回まで

  const raw = await env.SESSIONS_KV.get(key);
  let record = raw ? JSON.parse(raw) : { count: 0, start: now };

  if (now - record.start > windowMs) {
    record = { count: 0, start: now };
  }

  record.count++;
  await env.SESSIONS_KV.put(key, JSON.stringify(record), { expirationTtl: 120 });

  return record.count <= maxRequests;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = getCorsHeaders(request);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // === POST /api/session ===
    if (path === '/api/session' && request.method === 'POST') {
      return handleSessionPost(request, env, ctx, corsHeaders);
    }

    // === GET /api/session?id=xxx ===
    if (path === '/api/session' && request.method === 'GET') {
      return handleSessionGet(url, env, corsHeaders);
    }

    // 静的ファイルはCloudflare Pagesのアセット配信に委譲
    return env.ASSETS.fetch(request);
  }
};

// --- セッション保存 ---
async function handleSessionPost(request, env, ctx, corsHeaders) {
  try {
    // レート制限チェック
    const allowed = await checkRateLimit(request, env);
    if (!allowed) {
      return new Response(
        JSON.stringify({ success: false, session_id: '', error: 'Too many requests' }),
        { status: 429, headers: corsHeaders }
      );
    }

    const rawBody = await request.text();

    // リクエストボディのサイズ制限（10KB — バイト数で計算）
    const byteLength = new TextEncoder().encode(rawBody).length;
    if (byteLength > 10240) {
      return new Response(
        JSON.stringify({ success: false, session_id: '', error: 'Request body too large' }),
        { status: 413, headers: corsHeaders }
      );
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (parseErr) {
      return new Response(
        JSON.stringify({ success: false, session_id: '', error: 'Invalid JSON' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // データがオブジェクトであることを確認
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return new Response(
        JSON.stringify({ success: false, session_id: '', error: 'Invalid data format' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // フィールド数制限（最大20フィールド）
    if (Object.keys(data).length > 20) {
      return new Response(
        JSON.stringify({ success: false, session_id: '', error: 'Too many fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 各フィールドの文字長制限（500文字）
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 500) {
        return new Response(
          JSON.stringify({ success: false, session_id: '', error: `Field '${key}' exceeds maximum length` }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // KVとGAS Webhookが両方未設定の場合、データが完全に失われるためエラーを返す
    if (!env.SESSIONS_KV && !env.GAS_WEBHOOK_URL) {
      console.error('CRITICAL: SESSIONS_KV と GAS_WEBHOOK_URL が両方未設定です。リードデータが保存されません。');
      return new Response(
        JSON.stringify({ success: false, session_id: '', error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const sessionId = `s_${Date.now()}_${crypto.randomUUID()}`;

    // 環境変数 SITE_SOURCE からミラーサイト識別子を取得して付与
    const source = env.SITE_SOURCE || 'unknown';
    data.source = source;

    // 1. KVに保存（30日間保持）
    if (env.SESSIONS_KV) {
      await env.SESSIONS_KV.put(sessionId, JSON.stringify(data), {
        expirationTtl: 60 * 60 * 24 * 30,
        metadata: {
          property_type: data.property_type || '',
          area: data.area || '',
          town: data.town || '',
          source: source,
          created: data.created_at || new Date().toISOString(),
        }
      });
    }

    // 2. GAS Webhookに通知（バックグラウンド実行・レスポンスをブロックしない）
    if (env.GAS_WEBHOOK_URL) {
      ctx.waitUntil(
        fetch(env.GAS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, ...data }),
        }).then(res => {
          if (!res.ok) {
            // HTTPエラー（4xx/5xx）をログに記録する
            // バックグラウンド処理のためクライアントへのエラー返却は行わない
            console.error(`GAS Webhook HTTP error (non-blocking): status=${res.status} ${res.statusText}`);
            return;
          }
          // GASのdoPostはJSONレスポンスを返すので、ボディを検証してログに記録する
          return res.json().then(body => {
            if (body.status === 'ok') {
              console.log('GAS Webhook success:', JSON.stringify(body));
            } else {
              console.error('GAS Webhook returned non-ok status:', JSON.stringify(body));
            }
          }).catch(parseErr => {
            console.error('GAS Webhook response parse error (non-blocking):', parseErr);
          });
        }).catch(gasErr => {
          console.error('GAS Webhook network error (non-blocking):', gasErr);
        })
      );
    }

    return new Response(
      JSON.stringify({ success: true, session_id: sessionId, source: source }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('Session save error:', err);
    return new Response(
      JSON.stringify({ success: false, session_id: '' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

// --- セッション取得（同一オリジンからのみ許可） ---
async function handleSessionGet(url, env, corsHeaders) {
  const sessionId = url.searchParams.get('id');
  if (!sessionId || !env.SESSIONS_KV) {
    return new Response(
      JSON.stringify({ error: 'session not found' }),
      { status: 404, headers: corsHeaders }
    );
  }

  // セッションIDのフォーマット検証
  if (!/^s_\d+_[0-9a-f-]+$/.test(sessionId)) {
    return new Response(
      JSON.stringify({ error: 'invalid session id format' }),
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const data = await env.SESSIONS_KV.get(sessionId);
    if (!data) {
      return new Response(
        JSON.stringify({ error: 'session expired or not found' }),
        { status: 404, headers: corsHeaders }
      );
    }
    return new Response(data, { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'internal error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
