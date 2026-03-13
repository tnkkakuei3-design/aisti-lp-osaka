# ミラーサイト構築手順書

このドキュメントは、従業員が自身のCloudflare Pages環境に査定LPのミラーサイトを構築するための手順を説明します。

## 概要

各従業員は、この手順に沿って自身のGitHubアカウントとCloudflareアカウントを利用し、個別のミラーサイトをデプロイします。
フォームから送信されたリード情報は、全従業員共通のGoogleスプレッドシートに集約されます。どのミラーサイト経由のリードかを識別するため、各サイトに固有の識別子（`SITE_SOURCE`）を設定します。

## 1. 前提条件

作業を始める前に、以下のアカウントが必要です。

- **GitHubアカウント**: ソースコードを管理するために使用します。
- **Cloudflareアカウント**: サイトをデプロイし、ホスティングするために使用します。
- **TikTok広告アカウント**: 自身の広告効果を計測するためのピクセルIDを発行するために必要です。
- **Googleアカウント（GTM）**: Googleタグマネージャーのコンテナを作成するために必要です。
- **LINE公式アカウント**: ユーザーをLINEに誘導するための友だち追加URLが必要です。

## 2. 構築手順

### ステップ1: オリジナルリポジトリのクローン

まず、ターミナル（コマンドプロンプト）で以下のコマンドを実行し、最新のオリジナルリポジトリをローカル環境にクローンします。

```bash
git clone https://github.com/tnkkakuei3-design/aisti-lp-osaka.git
```

### ステップ2: 自分のGitHubに新しいリポジトリを作成

次に、自分のGitHubアカウントで、ミラーサイト用の新しい**プライベート**リポジトリを作成します。
リポジトリ名は任意です（例: `my-aisti-lp`）。

### ステップ3: ローカルリポジトリを自分のリポジトリにPush

クローンしたリポジトリの関連付けを、新しく作成した自分のリポジトリに変更し、コードをプッシュします。

```bash
cd aisti-lp-osaka
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```
※ `YOUR_USERNAME` と `YOUR_REPOSITORY` は、ご自身のものに置き換えてください。

### ステップ4: Cloudflare Pagesでプロジェクトを作成

1. Cloudflareダッシュボードにログインします。
2. `Workers & Pages` > `Create application` > `Pages` > `Connect to Git` を選択します。
3. ステップ3で作成した自分のGitHubリポジトリを選択し、`Begin setup` をクリックします。
4. プロジェクト名を設定し、`Production branch` が `main` になっていることを確認します。
5. `Framework preset` は `None` のままで問題ありません。
6. `Save and Deploy` をクリックして、最初のデプロイを実行します。

### ステップ5: KVネームスペースの作成

フォームの回答データを一時保存するためのKVストアを作成します。

1. Cloudflareダッシュボードの左メニューから `Workers & Pages` > `KV` を選択します。
2. `Create a namespace` をクリックします。
3. ネームスペース名に任意の名前を入力します（例: `aisti-sessions`）。
4. `Add` をクリックして作成を完了します。

作成したKVネームスペースは、次のステップで環境変数としてバインドします。

### ステップ6: 環境変数の設定

KVネームスペースの作成が完了したら、環境変数を設定します。

1. 作成したPagesプロジェクトの `Settings` > `Environment variables` に移動します。
2. `Production` 環境の `Add variable` をクリックし、以下の3つの変数を設定します。

| 変数名 | 値 | 説明 |
| :--- | :--- | :--- |
| `SESSIONS_KV` | （KVネームスペースをバインド） | フォームの回答データを一時保存するKVストアです。`KV namespace bindings`セクションで`Add binding`をクリックし、変数名に`SESSIONS_KV`、KVネームスペースには事前に作成したものを選択します。 |
| `GAS_WEBHOOK_URL` | `https://script.google.com/macros/s/xxxxxxxxxx/exec` | 全社共通のGAS Webhook URLです。この値は情シス部門から提供されます。 |
| `SITE_SOURCE` | `yamada` や `osaka-east` など | あなたのサイトを識別するためのユニークな名前です。**英数字とハイフンのみ**を使用してください（例: `taro-yamada`）。この値がスプレッドシートに記録されます。 |

設定後、`Settings` > `Deployments` に移動し、`Retry deployment` をクリックして変更を反映させてください。

### ステップ7: トラッキングID・外部サービスIDの変更

**このステップは、自身の広告効果を正確に計測するために必ず実施してください。**

`index.html` 内に記載されているプレースホルダーを、ご自身のIDに書き換えます。変更は後述の「Manusへの依頼用プロンプト」を使って依頼することを推奨します。

#### 変更必須（3項目）

**① TikTok Pixel ID（1箇所）**

- **ファイル:** `index.html`
- **行番号:** 38行目
- **変更前:** `ttq.load('TIKTOK_PIXEL_ID');`
- **変更後:** `ttq.load('あなたのTikTokピクセルID');`
- **取得方法:** TikTok広告マネージャー（[ads.tiktok.com](https://ads.tiktok.com)）にログイン → `アセット` > `イベント` > `ウェブイベント` からピクセルを作成または確認します。

**② GTMコンテナID（2箇所）**

- **ファイル:** `index.html`
- **行番号:** 25行目・191行目（2箇所とも変更が必要です）
- **変更前:** `'GTM-XXXXXXX'`（25行目）、`?id=GTM-XXXXXXX`（191行目）
- **変更後:** `'GTM-あなたのコンテナID'`（25行目）、`?id=GTM-あなたのコンテナID`（191行目）
- **取得方法:** Google Tag Manager（[tagmanager.google.com](https://tagmanager.google.com)）にログイン → コンテナを作成または選択すると、`GTM-XXXXXXX` 形式のIDが表示されます。

**③ LINE公式アカウントURL（2箇所）**

- **ファイル:** `index.html`
- **行番号:** 211行目・225行目（2箇所とも変更が必要です）
- **変更前:** `'https://lin.ee/XXXXXXX'`
- **変更後:** `'https://lin.ee/あなたのLINEアカウントID'`
- **取得方法:** LINE Official Account Manager（[manager.line.biz](https://manager.line.biz)）にログイン → 対象のアカウントを選択 → `友だちを増やす` > `友だち追加ガイド` から友だち追加URLを確認します。

#### 変更推奨（1項目）

**④ OGP画像・URL（2箇所）**

- **ファイル:** `index.html`
- **行番号:** 13行目・14行目
- **変更前:**
  ```html
  <meta property="og:image" content="https://satei.aisti.jp/assets/ogp.png">
  <meta property="og:url" content="https://satei.aisti.jp/">
  ```
- **変更後:**
  ```html
  <meta property="og:image" content="https://あなたのサイトURL/assets/ogp.png">
  <meta property="og:url" content="https://あなたのサイトURL/">
  ```
- **説明:** LINEやSNSでページがシェアされた際に表示されるサムネイル画像とURLです。Cloudflare Pagesでデプロイ後に発行されるURLに書き換えることで、シェア時の表示が正しくなります。

---

## 3. Manusへの依頼用プロンプト

### 汎用プロンプト（修正・機能追加）

今後、このリポジトリに対して修正や機能追加を行いたい場合は、以下のプロンプトテンプレートをManusに渡して依頼してください。

```
## 対象リポジトリ

`https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git`

## 依頼内容

（ここに具体的な修正内容を記述してください）

## 作業ブランチとPR

- 作業ブランチ: `fix/my-feature`
- PR先: `main`ブランチ

```

### ミラーサイト初期設定プロンプト（トラッキングID一括変更）

ステップ7のトラッキングID変更をManusに依頼する場合は、以下のプロンプトを使用してください。`【 】`内を自分の値に書き換えてから送信してください。

```
## 対象リポジトリ

`https://github.com/【あなたのGitHubユーザー名】/【あなたのリポジトリ名】.git`

## 依頼内容

index.html のトラッキングIDを以下の値に書き換えてください。

### 変更必須（3項目）

1. TikTok Pixel ID
   - 対象: index.html 38行目
   - 変更前: `ttq.load('TIKTOK_PIXEL_ID');`
   - 変更後: `ttq.load('【あなたのTikTokピクセルID】');`

2. GTMコンテナID（2箇所）
   - 対象: index.html 25行目・191行目
   - 変更前: `GTM-XXXXXXX`
   - 変更後: `【あなたのGTMコンテナID（例: GTM-ABC1234）】`

3. LINE公式アカウントURL（2箇所）
   - 対象: index.html 211行目・225行目
   - 変更前: `https://lin.ee/XXXXXXX`
   - 変更後: `【あなたのLINE友だち追加URL（例: https://lin.ee/AbCdEfG）】`

### 変更推奨（1項目）

4. OGP画像・URL（2箇所）
   - 対象: index.html 13行目・14行目
   - og:image の content を `【あなたのサイトURL】/assets/ogp.png` に変更
   - og:url の content を `【あなたのサイトURL】/` に変更

## 作業ブランチとPR

- 作業ブランチ: `fix/tracking-ids`
- PR先: `main`ブランチ

```

---

以上でミラーサイトの構築は完了です。不明点があれば、情シス部門までお問い合わせください。
