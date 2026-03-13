// _worker.js — Cloudflare Workers
// 大阪市中央区マンション査定LP用バックエンド
//
// 機能:
//   POST /api/session → 回答データをKV保存 + GAS Webhook通知 + セッションID返却
//   GET  /api/session?id=xxx → セッションデータ取得（LINE Webhook用）
//   GET  /api/cities?prefecture=xxx → 市区町村取得プロキシ（HeartRails GeoAPI中継）

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // === POST /api/session ===
    if (path === '/api/session' && request.method === 'POST') {
      return handleSessionPost(request, env);
    }

    // === GET /api/session?id=xxx ===
    if (path === '/api/session' && request.method === 'GET') {
      return handleSessionGet(url, env);
    }

    // === GET /api/cities?prefecture=xxx ===
    if (path === '/api/cities' && request.method === 'GET') {
      return handleCities(url);
    }

    // 静的ファイルはCloudflare Pagesのアセット配信に委譲
    return env.ASSETS.fetch(request);
  }
};

// --- セッション保存 ---
async function handleSessionPost(request, env) {
  try {
    const data = await request.json();

    // KVとGAS Webhookが両方未設定の場合、データが完全に失われるためエラーを返す
    if (!env.SESSIONS_KV && !env.GAS_WEBHOOK_URL) {
      console.error('CRITICAL: SESSIONS_KV と GAS_WEBHOOK_URL が両方未設定です。リードデータが保存されません。');
      return new Response(
        JSON.stringify({ success: false, session_id: '', error: 'Server configuration error' }),
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const sessionId = `s_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

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

    // 2. GAS Webhookに通知（非同期・非ブロッキング）
    if (env.GAS_WEBHOOK_URL) {
      try {
        await fetch(env.GAS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, ...data }),
        });
      } catch (gasErr) {
        console.error('GAS Webhook error (non-blocking):', gasErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, session_id: sessionId }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('Session save error:', err);
    return new Response(
      JSON.stringify({ success: false, session_id: '' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// --- セッション取得 ---
async function handleSessionGet(url, env) {
  const sessionId = url.searchParams.get('id');
  if (!sessionId || !env.SESSIONS_KV) {
    return new Response(
      JSON.stringify({ error: 'session not found' }),
      { status: 404, headers: CORS_HEADERS }
    );
  }
  try {
    const data = await env.SESSIONS_KV.get(sessionId);
    if (!data) {
      return new Response(
        JSON.stringify({ error: 'session expired or not found' }),
        { status: 404, headers: CORS_HEADERS }
      );
    }
    return new Response(data, { status: 200, headers: CORS_HEADERS });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'internal error' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// --- 市区町村取得プロキシ ---
async function handleCities(url) {
  const prefecture = url.searchParams.get('prefecture');
  if (!prefecture) {
    return new Response(
      JSON.stringify({ error: 'prefecture parameter required' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }
  try {
    const apiUrl = `https://geoapi.heartrails.com/api/json?method=getCities&prefecture=${encodeURIComponent(prefecture)}`;
    const res = await fetch(apiUrl, {
      cf: { cacheTtl: 86400, cacheEverything: true }
    });
    const data = await res.json();
    if (!data.response || !data.response.location) {
      return new Response(
        JSON.stringify({ cities: [] }),
        { status: 200, headers: CORS_HEADERS }
      );
    }
    const cities = data.response.location.map(loc => loc.city);
    const unique = [...new Set(cities)];
    return new Response(
      JSON.stringify({ cities: unique }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error('HeartRails API error:', err);
    return new Response(
      JSON.stringify({ cities: [], error: 'API unavailable' }),
      { status: 200, headers: CORS_HEADERS }
    );
  }
}
