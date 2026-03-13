/**
 * gas-webhook.js — Google Apps Script Webhook
 * 
 * Cloudflare Workers からのリード通知を受け取り、
 * Google スプレッドシートに記録し、通知メールを送信する。
 * 
 * 使い方:
 *   1. Google スプレッドシートを作成し、1行目にヘッダー行を設定
 *   2. Apps Script エディタ（拡張機能 → Apps Script）でこのコードを貼り付け
 *   3. デプロイ → ウェブアプリ → アクセスできるユーザー「全員」で公開
 *   4. 生成されたURLを Cloudflare Pages の環境変数 GAS_WEBHOOK_URL に設定
 *   5. メール通知を有効にする場合: Apps Script エディタ →
 *      プロジェクトの設定 → スクリプトプロパティ → NOTIFY_EMAIL を追加
 * 
 * ヘッダー行（A1〜Q1）:
 *   timestamp | session_id | source | property_type | area | town |
 *   floor_area | building_age | timing | est_low | est_high |
 *   utm_source | utm_medium | utm_campaign | utm_term | ttclid | landing_url
 */

/**
 * POSTリクエストを受け取るエンドポイント
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // ヘッダーが未設定の場合は自動作成
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'timestamp',
        'session_id',
        'source',
        'property_type',
        'area',
        'town',
        'floor_area',
        'building_age',
        'timing',
        'est_low',
        'est_high',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'ttclid',
        'landing_url'
      ]);
    }

    // データ行を追加
    sheet.appendRow([
      data.created_at || new Date().toISOString(),
      data.session_id || '',
      data.source || '',
      data.property_type || '',
      data.area || '',
      data.town || '',
      data.floor_area || '',
      data.building_age || '',
      data.timing || '',
      data.est_low || '',
      data.est_high || '',
      data.utm_source || '',
      data.utm_medium || '',
      data.utm_campaign || '',
      data.utm_term || '',
      data.ttclid || '',
      data.landing_url || ''
    ]);

    // リード通知メール送信
    sendLeadNotification_(data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('doPost error:', err);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * リード通知メールを送信する（内部関数）
 * スクリプトプロパティ NOTIFY_EMAIL が設定されている場合のみ送信
 */
function sendLeadNotification_(data) {
  const notifyEmail = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!notifyEmail) return;

  try {
    const source = data.source || 'unknown';
    const area = data.area || '不明';
    const subject = '[新規リード] ' + area + ' - ' + source;
    const body = [
      '新しい査定リードが届きました。',
      '',
      'セッションID: ' + (data.session_id || ''),
      'ソース: ' + source,
      '物件種別: ' + (data.property_type || ''),
      'エリア: ' + area,
      '町名: ' + (data.town || ''),
      '専有面積: ' + (data.floor_area || '') + '㎡',
      '築年数: ' + (data.building_age || '') + '年',
      '売却時期: ' + (data.timing || ''),
      '査定額: ' + (data.est_low || '') + '万円 〜 ' + (data.est_high || '') + '万円',
      '',
      'UTM Source: ' + (data.utm_source || ''),
      'UTM Medium: ' + (data.utm_medium || ''),
      'UTM Campaign: ' + (data.utm_campaign || ''),
      'UTM Term: ' + (data.utm_term || ''),
      'TikTok Click ID: ' + (data.ttclid || ''),
      'ランディングURL: ' + (data.landing_url || ''),
      '',
      '受信日時: ' + (data.created_at || new Date().toISOString()),
    ].join('\n');

    MailApp.sendEmail(notifyEmail, subject, body);
  } catch (mailErr) {
    console.error('Mail send error:', mailErr);
  }
}

/**
 * GETリクエスト（動作確認用）
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'GAS Webhook is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
