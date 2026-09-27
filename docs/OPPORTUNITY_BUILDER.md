# Opportunity Builder MVP

> **正本の役割**: この文書は、Opportunity Builderについて「何を実装したか」だけでなく、**なぜこの構成にしたのか、何を捨てたのか、誰が何を所有・負担するのか、どこまでをMake-Moneyが握るのか**までを残す意思決定正本である。将来v0/Bolt/Lovable等の実装providerが変わっても、この判断軸は維持する。

## 0. 発端 — 「儲かる情報を見せて終わり」では弱い

Make-Moneyはもともと、世界中の成功・失敗・P&L・市場の歪み・顧客の痛み・使用ツールを集め、ユーザーが「次にどこで金を作れるか」を発見する情報端末として設計された。

しかし、2026-09-18の検討で次の構造的な欠落が明確になった。

```
Make-Moneyで良い金脈を発見
        ↓
「これ、自分でも作れそう」
        ↓
ここから先はユーザーが自力で
Bolt / Lovable / v0 を探す
        ↓
別サイト登録
        ↓
長いプロンプトを書く
        ↓
技術選定
        ↓
生成・公開
```

この状態では、Make-Moneyが最も価値を生んだ瞬間、つまりユーザーが**「これを自分の事業にしたい」**と思った瞬間に、ユーザーと金の流れを外部サービスへ渡してしまう。

問題はコード生成機能が無いことではない。根本問題は、

> **「発見」から「所有する事業」へ変わる最後の摩擦をMake-Money自身が取れていないこと**

だった。

したがってBuilderは、便利な付属ツールではなく、Make-Moneyを**情報DBから事業実行OSへ進化させる橋**として位置付ける。

---

## 1. 最終的に目指す一気通貫ループ

最終形は以下。

```
① DISCOVER
儲かっている事例・金脈・変化を発見
        ↓
② UNDERSTAND
売上 / 利益 / 顧客 / 競合 / 成功・失敗要因を理解
        ↓
③ DECIDE
「自分ならこれを作る」を決める
        ↓
④ SPEC
Make-MoneyがBuild Specへ変換
        ↓
⑤ BUILD
Make-Money内で実物を生成
        ↓
⑥ REFINE
自然言語で修正
        ↓
⑦ LAUNCH
ユーザー所有のHosting / DB / Domainへ公開
        ↓
⑧ SELL
Make-Money MarketplaceでSaaS・コード・テンプレート・事業を販売
        ↓
⑨ EARN
売上発生。Make-Moneyは手数料を得る
        ↓
⑩ LEARN
実際に何が作られ、売れたかをOpportunity DBへ還流
        ↓
より精度の高いDISCOVERへ戻る
```

重要なのは、Builder単体でBolt/Lovableと競争することではない。

**Make-Moneyだけが握るべき独自資産は「何を作るべきかを決める前段のデータ」と「作った後の実売上データ」であり、コード生成エンジンは交換可能な部品である。**

---

## 2. 検討した方式と、採用・不採用理由

### A. Bolt / Lovableへ外部遷移させる方式

```
Make-Money
  ↓
「Boltで作る」「Lovableで作る」
  ↓
外部サービスへ移動
```

**利点**
- 実装が最も簡単。
- Make-Money側が生成原価を負担しなくてよい。
- 外部サービスのAffiliateがあれば紹介収益化も可能。

**問題**
- 一番熱量が高い瞬間にユーザーがMake-Moneyから離脱する。
- プロジェクト、生成履歴、編集体験、課金が外部サービス側へ移る。
- Make-Moneyが「金脈の紹介サイト」で止まり、「事業が始まる場所」になれない。
- ユーザーが外部AIに再度「何をどう作るか」を説明する摩擦が残る。

**判断**
- **主導線には採用しない。**
- 将来の「Boltで開く」「LovableへExport」のような任意出口・Affiliate出口として残す。

### B. Make-MoneyがBolt/Lovableの通常アカウントを1つ持ち、全ユーザーへ裏で共有する方式

**問題**
- 通常の個人・チーム契約を不特定多数ユーザーへ再提供する構造は、アカウント共有・再販売規約と衝突し得る。
- 1契約の認証情報を多数ユーザーの生成基盤として扱うこと自体が運用・セキュリティ上弱い。
- providerのUI・アカウント設計へ強く依存する。

**判断**
- **不採用。**
- 「月25ドルのBoltを1契約すれば全員分作れる」という前提には立たない。

### C. v0 Platform APIをMake-Moneyの裏側から呼ぶ方式

**利点**
- 第三者サービス組込み用のPlatform APIとして設計されている。
- ユーザーはMake-Moneyを離れない。
- Make-Money側でBuild Spec、認証、原価、生成履歴、UIを握れる。
- providerを将来交換しやすい。
- APIが返すcredits使用量を記録できるため、原価管理しやすい。

**判断**
- **MVPの本命として採用。**

### D. Bolt OSS / bolt.diy + WebContainerで完全自社Builderを作る方式

**利点**
- 最終的にはMake-Money独自Builderへ近づけられる。
- ブラウザ内Node.js実行・ファイル・Terminal・Previewまで自社UIに内包しやすい。
- GPT / Claude / Gemini等を交換可能にできる。

**問題**
- 初期実装量が大きい。
- WebContainerの商用本番利用条件・ライセンス費が別途存在する。
- 「ユーザーが本当にMake-Money内で作りたがるか」を検証する前から自前IDEを作ると過剰投資になる。

**判断**
- **第二段階以降の本命。**
- まずv0 APIで「Opportunity → Build」の需要を証明してから内製化する。

### E. Bubble / FlutterFlow / Replit等

- Bubble: 外部Data/Workflow APIは強いが、今回欲しい「第三者サイトからAIでアプリ全体を生成」の中心providerにはしない。
- FlutterFlow: 将来のモバイルアプリ生成出口として候補。Web中心MVPの第一providerにはしない。
- Replit: 外部開発環境としては強いが、現時点のMake-Money内蔵Builderの中核にはしない。

**原則**
- provider名から設計を始めない。
- **Make-Moneyが握るべき責務を決め、その責務に合うproviderだけを交換可能に接続する。**

---

## 3. 誰が何をするか — 永続的な責務分離

| 主体 | 責務 |
|---|---|
| **Make-Money** | 金脈発見、成功/失敗データ、競合、P&L、機会判定 |
| **Make-Money AI** | Opportunityをユーザーが作れるBuild Specへ圧縮 |
| **Make-Money Builder UI** | 生成・Preview・修正・Exportの一貫体験 |
| **v0等の生成provider** | コード生成、生成中ランタイム、Preview |
| **Vercel / Cloudflare等** | 将来の本番Hosting |
| **DB/Auth provider** | 将来の本番ユーザーデータ・認証 |
| **Stripe / Stripe Connect** | 商品決済、Marketplace seller onboarding、将来の分配 |
| **ユーザー** | 何を作るか選ぶ、修正、価格決定、公開後の本番費用を持つ |
| **Make-Money Marketplace** | 将来、作った商品・SaaS・コード・事業を売る市場と手数料徴収 |

Make-Moneyは**頭脳＋市場**を握る。  
外部providerは**工場・配管**として使う。

---

## 4. 所有権の設計

### ユーザーが持つべきもの

将来の利用規約・商品設計でも、原則として以下をユーザー所有へ寄せる。

- ユーザーが作ったプロジェクト
- 生成ソースコード
- ユーザーが接続した本番DBの顧客データ
- ユーザーのドメイン
- ユーザーの本番Hosting
- ユーザーの商品・事業
- Marketplace販売後の売上（Make-Money手数料控除後）

現MVPでも、provider側に閉じ込めないため**本人限定のソースZIP Export**を実装済み。

### Make-Moneyが持つもの

- Opportunity / 企業 / 成功・失敗の独自データ
- Build Spec生成ロジック
- Builder orchestration
- Marketplace
- 生成原価・Build利用実績
- 規約と同意の範囲で取得する匿名化・集計済み成果データ
- 「どんなOpportunityが実際にBuildされ、公開され、売れたか」という独自統計

最後の実績データが非常に重要である。

将来、

> 「この市場は面白そう」

ではなく、

> 「Make-Money上で73件が公開され、そのうち18件が初売上、5件がMRR10万円を超えた」

という**行動・売上ベースのOpportunity Intelligence**へ進化できる。

---

## 5. 料金を誰が持つか

### 開発・生成時

Make-Moneyがserver-sideの生成provider契約を持つ。

```
ユーザー
 ↓ Build Credits / PRO
Make-Money
 ↓ provider API原価を支払う
v0等
```

ユーザーにv0契約を要求しない。  
ユーザーは**Make-Moneyへ払う**。

現MVPではまだBuild Credits課金は未実装だが、APIが返した実creditsを `build_sessions.credits_cost` へ累積し、`BUILDER_DAILY_CREDIT_LIMIT` でユーザー単位の24時間上限をかけている。

つまり「修正を100回押されて運営原価だけ無限に膨らむ」構造にはしない。

### 本番公開後

原則として以下はユーザーへ移す。

- Hosting
- DB
- Domain
- 本番AI API
- Email送信
- 外部API
- 大量Storage / Compute

Make-Moneyが全ユーザーの成功後インフラまで無制限に肩代わりすると、成功するほど粗利が壊れるためである。

**Make-MoneyはBuildの摩擦を負担し、本番の継続原価はユーザー所有へclaim / transferする。**

---

## 6. 何が作れるか / 何を約束しないか

Builderの主戦場は、個人〜小規模チームが作るWeb事業。

### 得意領域

- Landing Page
- Directory / Comparison
- Calculator / Utility
- AI micro tool
- CRUD SaaS
- 会員制Webサービス
- Dashboard
- Stripe課金SaaS
- Booking
- 軽量EC
- B2B Internal Tool
- 小規模MarketplaceのMVP

### 難易度が上がる領域

- 大規模SNS
- Uber型リアルタイム配車
- 大規模動画基盤
- 高頻度取引・証券・銀行基幹
- 高規制医療の基幹
- AAAゲーム

**「AIが画面を作れた」ことと「本番で安全に金を取れる」ことは別。**

AI Builderは0→70〜80%を非常に速くするが、残りには以下がある。

- Auth / 権限
- Stripe webhook
- 二重決済防止
- Secrets
- Rate limit
- Backup
- Monitoring
- 返金
- Privacy
- 退会・データ削除
- E2E
- Security scan
- 障害対応

したがって最終的には、

```
BUILD
 ↓
TEST
 ↓
SECURITY GATE
 ↓
PAYMENT GATE
 ↓
DEPLOY
 ↓
MONITOR
```

までMake-Moneyの公開導線に入れる。

---

## 7. なぜBuilderはMake-Moneyの収益に効くのか

Make-Moneyの最優先は運営収益である。Builderは収益出口を増やす。

将来の収益レイヤー:

1. **PRO** — Opportunity / 深掘りデータ
2. **Build Credits** — 生成・修正
3. **外部Builder Affiliate** — Bolt/Lovable等へ任意Exportするユーザーから紹介収益
4. **Hosting / Domain / SaaS紹介** — 公開に必要な外部ツール送客
5. **Marketplace take rate** — SaaS / source / template販売手数料
6. **Stripe Connect型Platform fee** — Marketplace決済手数料
7. **M&A** — 育った事業の売却仲介
8. **成果データAPI** — 「実際に何が作られ、売れたか」の高価値データ

Builderの価値は「コードを生成できる」ことではない。

> **ユーザーが金脈を見た直後の購買・行動意欲を、Make-Money内の取引へ変えること**

にある。

---

## 7.1 Distribution Marketplace — 販売力そのものを市場化する

現行のMarketplace構想は「ユーザーが自分で作った商品・SaaS・コード・事業を売る」までを定義している。将来はここを一段拡張し、**商品を作る人と、売る人を分離できるDistribution Marketplace**へ進化させる。

### 4者の責務

| 主体 | 将来の役割 |
|---|---|
| Creator / Provider | 商品・サービスを掲載し、価格、販売可否、紹介報酬条件を設定 |
| Distributor / Partner | 許可された商品を選び、専用attributionで紹介・販売 |
| Buyer | 商品・サービスを購入 |
| Make-Money | 発見、掲載、マッチング、attribution、決済・分配、台帳、成果データ還流 |

### 将来の必須仕様

- 商品単位の紹介・販売可否
- 単発commission / 継続commission
- attribution window / source / channel
- click → conversion → refund → payout の一貫台帳
- Stripe Connect等によるseller onboarding / split / Platform fee
- 返金・chargeback時のcommission調整
- 販売者ごとの実績・継続率・不正検知
- 商品 × 販売者 × チャネルごとの成果集計
- 規制領域を一般商品から分離するpolicy gate

### 既存パートナー制度との違い

既存の `/partners` は**Make-Money自身を紹介する制度**である。Distribution Marketplaceは、**Make-Money上に存在する第三者の商品を別ユーザーが販売するための市場**であり、別レイヤーとして扱う。

### Goal Layerとの接続

将来は「何を作りたいか」だけではなく、「月いくら増やしたいか」から、価格・commission・必要成約数・必要顧客数を逆算して候補へ接続する。ただし全貌を見せるTerminalを廃止して簡易診断サイトへ退行させない。

### 成果データをMoatにする

Revenue Feedbackは単に「何が売れたか」だけでは足りない。規約・同意・法令の範囲で、少なくとも以下を集計できる設計へ進める。

- どの商品が売れたか
- 誰が販売したか
- どのチャネルから成約したか
- 価格・commission条件
- conversion / refund / 継続
- 商品 × 販売者 × チャネルの相性

Make-Moneyの長期的な差別化は生成AIそのものではなく、**実際に何が作られ、誰がどう売り、どの取引が継続したかという実取引データ**に置く。

## 7.2 Network Distribution — 販売者そのものを自己増殖させる

Distribution Marketplaceに不足していたのは、商品を売るDistributorが**次のDistributorを生み、その下位販売者の実販売によって販売網自体が増殖する仕組み**である。

### 基本ループ

```
Creator / Provider
  ↓
商品をMarketplaceへ掲載
  ↓
Distributor A が販売
  ↓
Buyerが購入
  ├─ Buyerのまま利用
  └─ Distributorへ転換
          ↓
      新しいBuyerを獲得
```

Distributor AがDistributor Bを紹介した場合も、Bの登録だけでは報酬を発生させない。

```
Distributor A
  ↓ Bを紹介
Distributor B
  ↓ 第三者Buyerへ販売
settled revenue
  ├─ B: direct commission
  ├─ A: small network override
  ├─ Provider: seller revenue
  └─ Make-Money: Platform fee
```

### 報酬原則

- `Direct seller reward > Network override`
- 初期は1-level overrideを本命とする
- 2-level以上は法務・unit economics・fraudデータ確認後まで導入しない
- recruitment自体への報酬は出さない
- network overrideは元注文と同じorder lineageへ紐付ける
- refund / chargeback / fraud確定時はdirect commissionと同様にVOID / REVERSEDできる

### Personal Storefront

各Distributorは自分の販売面を持ち、自分が作った商品と他者商品を同じStoreで扱える。

```
@user Store
├─ 自作SaaS
├─ 他者のAI SaaS
├─ Template
├─ Service
└─ Other approved products
```

Storefrontは単なるlink一覧ではなく、比較、Collection、Bundle、対象顧客別の並び替え等へ拡張可能にする。

### ロールは循環する

```
Buyer
  ↓
Distributor
  ↓
Builderで自分の商品を作る
  ↓
Creator / Provider
  ↓
他Distributorへ販売を開放
```

これによりMake-Moneyは供給側と販売側の両方を内部で増やす。

### AI Distribution Assistant

Distributorの「何を、どこで、どう売るか分からない」を減らすため、商品と実販売データを基に以下を生成する。

- X投稿
- 長文記事
- 比較ページ
- Landing Page
- Short video / YouTube script
- Email / Newsletter
- FAQ
- Store description
- buyer persona別訴求

最終的には **Product × Distributor × Audience × Channel × Creative** の成果を蓄積し、売れやすい組み合わせを推薦する。

### 成長指標

紹介人数ではなく、以下を主要指標とする。

- third-party Buyer由来のSettled GMV
- Distributor activation / first-sale conversion
- Buyer → Distributor conversion
- Revenue per active Distributor
- Direct vs network-derived GMV
- Refund / chargeback / fraud rate
- Distributor retention
- Product × Distributor × Channel conversion

### 導入順序

1. Direct Distribution
2. Marketplace transaction / payout ledger
3. Storefront
4. Buyer → Distributor onboarding
5. Referral graph記録
6. Unit economics / fraud / refund実測
7. 対象国の法務・税務・KYC / payout確認
8. 条件を満たす商品だけ1-level network override
9. AI Distribution Assistant
10. Product × Distributor × Channel matching

高額入会金、mandatory inventory、自己購入義務、報酬受領資格だけを買わせるpaid qualificationを前提にしない。法的区分は名称ではなく実態・契約・勧誘・報酬条件で決まるため、本番導入前に対象国ごとの専門家レビューを行う。

詳細は [DISTRIBUTION_NETWORK_STRATEGY.md](./DISTRIBUTION_NETWORK_STRATEGY.md) を参照。


## 8. 現行MVPで確定した流れ

```
SYNTHESIS / 独自アイデア
  ↓
「この事業を作る」
  ↓
Build Spec
  ↓
Make-Money Builder
  ↓
v0 Platform API
  ↓
private preview proxy
  ↓
Make-Money内でLive Preview
  ↓
自然言語で追加修正
  ↓
ソースZIP Export
```

## Responsibility boundary

### Make-Moneyが持つ

- 機会データ、ユーザーの独自アイデア
- Build Spec
- Builder UI
- ユーザーとprovider chatの所有者対応
- providerの生成credits実績
- private previewへの認可
- ユーザー退会時のBuilderメタデータ削除

### v0に任せる

- ソースコード生成
- 生成中の実行環境
- private preview
- 同じchatへの追加生成

v0は交換可能な実行providerとして扱う。機会データ・Build Spec・ユーザー関係をprovider側へ固定しない。

## Cost boundary

- Make-Moneyが `V0_API_KEY` をserver-side secretとして持ち、生成時のprovider creditsを一旦負担する。
- `build_sessions.credits_cost` にAPIが返した実消費creditsを累積する。
- `BUILDER_DAILY_CREDIT_LIMIT` で1ユーザー24時間の実消費creditsに上限をかける。未設定時は5 credits。
- MVP段階ではユーザーへのcredits販売・請求はまだ実装していない。
- 本番Hosting、DB、Domain、AI APIなどの継続費をMake-Moneyが無制限に背負う設計にはしない。公開/claim機能を追加する際にユーザー所有へ分離する。

## Security

- `V0_API_KEY` は `NEXT_PUBLIC_*` に置かない。
- Firebase ID Tokenを検証し、build sessionは `user_id` で必ず所有者スコープする。
- v0 preview tokenをブラウザへ返さない。
- 認証済みユーザーへ短命のHttpOnly preview ticketを発行し、Make-Money serverがpreview tokenを付けてproxyする。
- preview upstreamの `Set-Cookie`、credential、forwarding headersを除去する。
- iframeはsandboxし、生成コードへ親Make-Money画面と同じorigin権限を与えない。
- Builder write APIはbody sizeとrate limitを持つ。
- 生成promptは秘密鍵直書き、架空実績、スパム・なりすまし・規約回避を禁止する。

## D1

Migration:

```bash
pnpm db:migrate:local
pnpm db:migrate:remote
```

New table: `build_sessions`

保存するもの:
- Make-Money user
- source idea
- provider / provider chat id
- Build Spec
- status
- preview ticket secret
- cumulative provider credits
- bounded error message

生成コード本体はD1へ複製しない。

## Provider configuration

Development:

```bash
V0_API_KEY=... BUILDER_DAILY_CREDIT_LIMIT=5 pnpm dev
```

Cloudflare production:

```bash
wrangler secret put V0_API_KEY
```

`.env.example` には値を置かず、変数名だけ記載する。

## Routes

- `GET /api/build/context?ideaId=...` — owned idea + Build Spec + latest session
- `POST /api/build/prepare` — client-only draft ideaを本人のD1へ保存
- `POST /api/build/start` — Build Specから新規v0 chatを生成
- `POST /api/build/message` — 同じ生成物を自然言語で修正
- `GET /api/build/export?sessionId=...` — 本人だけが生成ソースZIPを取得
- `POST /api/build/preview-ticket` — private preview用HttpOnly ticket
- `/api/build/preview/[sessionId]/...` — private preview proxy
- `/build/[ideaId]` — Builder workspace

## Explicit non-goals of this MVP

まだ実装していないもの:
- Vercel/Cloudflareへのユーザー所有本番deployment
- GitHubへの直接push/export（ZIPダウンロードは実装済み）
- production secret provisioning
- automatic security/build/E2E gate for generated apps
- Build Creditsのユーザー課金
- Marketplace出品
- Stripe Connect seller onboarding / split payment
- SaaS/ソースコード/事業M&Aの販売フロー

これらは「生成できるか」を確認した後の第二段階。MVPでは外部builderへ離脱せず、Make-Money内で生成・preview・修正まで成立させる。
