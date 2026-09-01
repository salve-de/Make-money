# Product Requirements Document

## 1. Product name

GOLDMINE RADAR

## 2. Problem

金儲け、新市場、成功事例、政府・企業支出に関する情報は、ニュース、SNS、企業DB、政府DB、レビューサイト、M&A市場へ分散している。ユーザーは、次の疑問を一続きで解けない。

- 誰が何でいくら得たか
- その金は誰から来たか
- なぜ需要が発生したか
- その数字は売上・利益・調達・推定のどれか
- 今も伸びているか
- 競合は何か
- 新規参入者が取れる場所は残っているか
- 自分の能力・資金・地域で何ができるか

一方、サービス運営者は、自分の製品を掲載しても適切な見込み客に届かず、単なる宣伝投稿として埋もれる。

## 3. Product objective

ユーザーが10秒以内に面白いMoney Signalを理解し、3分以内にOpportunityの根拠と自分の入口を判断し、保存・フォロー・掲載・問い合わせのいずれかへ進めること。

## 4. Primary user stories

### Discovery user

- 私は儲かる事業を眺めたい。ホームを開くだけで強い事例が流れてほしい。
- 私は自分にもできそうな事例だけ見たい。人数、資金、スキル、期間で絞り込みたい。
- 私はまだ伸びる市場を見つけたい。現在の需要、競争、時間的余地を確認したい。
- 私は候補を保存し、後から変化を追いたい。

### Builder

- 私は次に作るものを決めたい。誰が払うか、既存不満、価格、獲得経路を知りたい。
- 私はこの機会を作ると宣言し、興味を示した利用者へ知らせたい。
- 私は同じOpportunityに紐づく既存製品を比較したい。

### Product owner

- 私はURLだけでサービス掲載を開始したい。
- 私は顧客、ベータ、レビュー、提携など掲載目的を選びたい。
- 私は閲覧、保存、外部遷移、需要反応を確認したい。
- 私は自分が所有者であることを確認し、情報を更新したい。

### Buyer / user

- 私は問題からサービスを探したい。
- 私は価格、用途、対応言語、代替製品を比較したい。
- 私は掲載者へ問い合わせたり、試したりしたい。

## 5. MVP scope

### Included

- 発見フィード
- Opportunity一覧・詳細
- Money Signal一覧
- Product一覧・詳細
- Demand Gap一覧
- 検索と軽量フィルター
- 保存とMY GOLDMINE
- 反応：面白い、儲かりそう、作れそう、欲しい
- URL起点のサービス掲載フォーム
- Evidenceランク表示
- デモデータ
- Supabase用初期スキーマ
- 投稿APIのデモフォールバック

### Not included in first release

- 本人確認の完全自動化
- Stripe等の売上接続
- 本番決済
- ユーザー間DM
- M&A契約・エスクロー
- 求人応募
- 自動Webスクレイピング
- 法人向けCSV/API
- 完全な認証・権限管理

## 6. Functional requirements

### FR-01 Home feed

- 金額、人数、期間、カテゴリ、証拠ランクをカード上部に表示する。
- Opportunity、Money Signal、Product launch、Failureを混ぜられる構造にする。
- モバイルで片手操作できる。

### FR-02 Opportunity detail

- 何が起きたか
- 誰が払ったか
- なぜ今か
- 未充足需要
- 競合
- 参入方法
- リスク
- Evidence
- 関連Product
- 次に確認する3項目

### FR-03 Product listing

- 掲載目的を表示する。
- Price model、target customer、verification stateを表示する。
- OpportunityとDemandへ接続する。

### FR-04 Save and reactions

- 未ログインでもlocalStorageへ保存できる。
- 将来ログイン後にサーバーへ同期できるデータ構造にする。

### FR-05 Submission

- URLを最初に入力する。
- サービス名、概要、顧客、問題、価格、目的、証拠URLを構造化する。
- 送信後はpendingとして扱う。
- Supabase未設定時もデモとして完了できる。

### FR-06 Trust

- 数字の種類を明示する。
- Evidence sourceと確認レベルを表示する。
- SponsoredとOrganicを分離する。

## 7. Non-functional requirements

- モバイル・デスクトップ対応
- JavaScript無効時も主要コンテンツが読める範囲を維持
- 初期表示を軽量にする
- WCAGを意識したコントラスト、focus、aria-label
- 外部キーなしでデモ起動可能
- Vercelで標準的にデプロイ可能
- 機密キーをクライアントへ露出しない

## 8. Acceptance criteria

- `npm run build` が成功する
- ホームから主要5画面へ移動できる
- Opportunity・Productの動的詳細ページが表示される
- 保存がリロード後も残る
- MY GOLDMINEで保存項目が確認できる
- Submitが入力検証し、成功状態を表示する
- 375px幅で横スクロールが発生しない
- Sponsored labelなしで広告カードを表示しない
