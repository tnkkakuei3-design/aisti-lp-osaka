# PROJECT_CONTEXT.md — aisti-lp-osaka（大阪版）

## プロジェクト概要

本リポジトリは、不動産査定チャット型ランディングページ（LP）の**大阪版**です。ユーザーがチャット形式で不動産査定に必要な情報を入力し、査定依頼へ誘導するコンバージョン最適化型のLPを、大阪エリア向けにカスタマイズして提供します。汎用版（aisti-satei-chat-lp）をベースに、大阪地域特有のコンテンツや訴求ポイントを反映しています。

## 技術スタック

| 項目 | 内容 |
|------|------|
| フロントエンド | バニラJS（Vanilla JavaScript） |
| ホスティング | Cloudflare Pages |
| サーバーレス関数 | Cloudflare Workers（Pages Functions Advanced Mode） |
| バージョン管理 | GitHub |

## リポジトリの役割

- **種別**: 大阪版（大阪エリア向けカスタマイズLP）
- **用途**: 大阪エリアの不動産査定チャット型LPの提供
- **質問ステップ数**: 5ステップ

## 最新安定タグ

```
aisti-lp-v1.2.8
```

## 公開URL

https://aisti-lp-osaka.pages.dev/

## 関連リポジトリ

| リポジトリ | 種別 | 最新タグ | 公開URL |
|-----------|------|---------|--------|
| aisti-satei-chat-lp | 汎用版 | v1.2.6 | https://aisti-satei-chat-lp.pages.dev/ |
| aisti-lp-osaka | 大阪版 | aisti-lp-v1.2.8 | https://aisti-lp-osaka.pages.dev/ |
| aisti-lp-fukuoka | 福岡版 | aisti-lp-fukuoka-v1.0.9 | https://aisti-lp-fukuoka.pages.dev/ |
| aisti-lp-tokyo | 東京版 | aisti-lp-tokyo-v1.0.9 | https://aisti-lp-tokyo.pages.dev/ |

## 更新履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2026-03-14 | aisti-lp-v1.2.9 | Phase 3バグ修正（font-weight統一・GASレスポンス検証・showComplete二重実行ガード・URL更新・KVコメント） |
| 2026-03-14 | aisti-lp-v1.2.8 | Phase 2バグ修正（APIエラーサイレント失敗・一棟物件専有面積スキップ・CSP補強） |
| 2026-03-14 | aisti-lp-v1.2.7 | Phase 1バグ修正（セルインジェクション対策・renderNumberInput await欠落） |
| 2026-03-10 | aisti-lp-v1.2.8 | 最新安定版 |
| 2026-03-10 | aisti-lp-v1.2.7 | 旧安定版 |
