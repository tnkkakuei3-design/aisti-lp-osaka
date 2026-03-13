# ミラーサイト構築手順書

このドキュメントは、従業員が自身のCloudflare Pages環境に査定LPのミラーサイトを構築するための手順を説明します。

## 概要

各従業員は、この手順に沿って自身のGitHubアカウントとCloudflareアカウントを利用し、個別のミラーサイトをデプロイします。
フォームから送信されたリード情報は、全従業員共通のGoogleスプレッドシートに集約されます。どのミラーサイト経由のリードかを識別するため、各サイトに固有の識別子（`SITE_SOURCE`）を設定します。

## 1. 前提条件

作業を始める前に、以下のアカウントが必要です。

- **GitHubアカウント**: ソースコードを管理するために使用します。
- **Cloudflareアカウント**: サイトをデプロイし、ホスティングするために使用します。

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

### ステップ5: 環境変数の設定

デプロイが完了したら、環境変数を設定します。

1. 作成したPagesプロジェクトの `Settings` > `Environment variables` に移動します。
2. `Production` 環境の `Add variable` をクリックし、以下の3つの変数を設定します。

| 変数名 | 値 | 説明 |
| :--- | :--- | :--- |
| `SESSIONS_KV` | （KVネームスペースをバインド） | フォームの回答データを一時保存するKVストアです。`KV namespace bindings`セクションで`Add binding`をクリックし、変数名に`SESSIONS_KV`、KVネームスペースには事前に作成したものを選択します。 |
| `GAS_WEBHOOK_URL` | `https://script.google.com/macros/s/xxxxxxxxxx/exec` | 全社共通のGAS Webhook URLです。この値は情シス部門から提供されます。 |
| `SITE_SOURCE` | `yamada` や `osaka-east` など | あなたのサイトを識別するためのユニークな名前です。**英数字とハイフンのみ**を使用してください（例: `taro-yamada`）。この値がスプレッドシートに記録されます。 |

設定後、`Settings` > `Deployments` に移動し、`Retry deployment` をクリックして変更を反映させてください。

## 3. Manusへの依頼用プロンプト

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

以上でミラーサイトの構築は完了です。不明点があれば、情シス部門までお問い合わせください。
