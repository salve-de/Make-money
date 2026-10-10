# MAKEMONEY｜未決事項の独立再調査・経営判断（2026-10-10）

調査日：2026-10-10 JST。対象：既存議論、PR #221 の事業・法務・技術資料、mainの実コード、外部事業者の一次情報、日本の行政資料。実APIの認証操作・契約締結・課金・出金・デプロイは行っていない。

**この資料が証明するもの**：公式に公開されている仕様・価格・注意事項、コードの存在と不足、妥当な現時点の優先順位。**証明しないもの**：MAKEMONEY名義の個別契約、法務適合の最終意見、真のAPI原価、本人移管のE2E、成約率・継続率、本番利用可能な完成機能。

> オーナーが指定した最上位目的は「長期実利益の最大化」「十分な利用者価値」「費用・賠償・サーバー負担・運用工数を最小化」。従来文書の「最終」「採用」は、本番契約・価格・技術の全面確定ではない。既存UI・定期収集・R2・権利/公開ゲート、進行中PRを保護し、外部効果は個別承認を要する。

## 1. 経営上の暫定結論

1. **情報商品（事例、機会、型、更新）を有料価値の実体として先に検証する。** 全ユーザーを起業・制作へ誘導しなくても会費が生まれる。無料事例は信頼と発見の入口、PROは更新される判断材料。競合が販売している事実は市場の存在を示すが、MAKEMONEYの購入率・価格適正を証明しない。
2. **AI制作は「サイト内操作を実現できる」と「MAKEMONEYが責任を負わず本人が直接契約する」を同一視しない。** 外部公式APIを使うと、利用者ごとの隔離は可能でも契約・補償/原価がMAKEMONEYに残り得る。本人直接契約型と、自社API再提供型を別々に採算・責任比較する。
3. **制作物のホスト/DB/Auth/ドメイン/顧客サポートは原則制作者本人の直接契約とする。** 本人環境へ初回からデプロイするのが第一案。後日オーナー移管する仕組みは例外的な代替に過ぎない。
4. **Stripe Connectでの10%成約手数料を「責任最小」として既定採用しない。** 日本向け2026年9月28日改定のConnect規約では、SMRの扱いを除き、プラットフォームが連結アカウントの損失を負い得る。Makerが売上を預からない設計だけでは契約責任まで消えない。Stripeとの書面確認前は外部本人決済＋掲載料/正規紹介契約などを代替収益として比較する。
5. **本番費用の発生主体と支出上限が決まらない限り無料制作を無制限提供しない。** 旧「1クレジットの外部原価上限3円」は採算上の仮定で、生成アプリ1本の実コストではない。
6. **本番未完成を完成と呼ばない。** 動作する一連の制作・本人公開・ストア自動下書き/同意掲載をE2Eで証明し、課金・紹介を別段階で実証する。G0～G6の目的価値は維持する。

## 2. AI制作会社の比較：公開一次資料から判定できた範囲

| 候補 | 公式に確認できた提供機能 | MAKEMONEYにとっての制約 | 現在の判定 |
|---|---|---|---|
| **OverSkill Partner API** | 制作者別team/API keyの作成、プロンプト生成/改修、非同期状態、iframeプレビュー、デプロイ、Webhooks。20生成/時/key、10公開/時/key。ソース全体の外部持出しは10アプリ/日/アカウントの制約あり | partner keyとcreator keyをMakerが管理。ユーザー本人契約・本人請求・完成物の外部独立ホストは別問題。契約で再販/補償/解約/サービス停止・実料金の書面確認が必要 | **第一の実機比較候補／未契約・未採用** |
| **Totalum App Builder / white-label API** | プロンプト→フルスタック、認証・DB・ホスティング、生成/修正、コード・GitHub連携、エクスポート/インポート、white-label。2026-10-08境の新v2エンジンあり | partner所有API keyからの従量料金。公開物はまずTotalum管理インフラ。アカウント間exportはコード/DB/ファイルに対応する一方、認証利用者・パスワード・セッションは移らない。別ホストで動くことを保証しない。v2の月額ホスト費・API負担が要確認 | **第二の実機比較候補／未契約・未採用** |
| **Vercel v0 Platform API** | 第三者Appへv0 APIを組み込める。現行コードはv2 APIに固定 | API Terms §5でEnd Usersの行為/違反に広い責任・補償。§9の$500はVercelからMakerへの責任上限でありMakerの補償上限ではない。ベータ/API版や契約が現時点で本番受容できるか別審査 | **標準契約のまま不特定多数への再提供はNO-GO推奨** |
| **Lovable Build with URL** | プロンプトを付与したLovable制作画面へ遷移可能。ユーザーのLovableアカウント上で制作 | Maker画面内のヘッドレス生成・改修・ソース同期が公式に保証されたわけではない。URL引渡しはUXの一段階低い別方式 | **責任・運用を抑えた暫定退避候補** |
| **Bolt / Replit** | それぞれの製品にAI制作環境あり。一部外部SDK/連携あり | Makerによる完全ヘッドレス制作の公式許諾、本人直接契約＋サイト内編集、料金・責任を今回の一次資料では立証できない。SDKの存在だけで製品API再販の権利にはならない | **未証明として比較表に残す。不可とは断定しない** |

**OverSkill料金の矛盾**：2026-10-10取得の /pricing はStudio $99/月、Max $199/月からと表示。一方 /help/articles/overskill-plans-and-pricing はStarter $39、Studio $99、Max未販売と説明。前者が「live pricing final」とされるが、Partner API契約料金/単価と一般消費者料金は別。**現在販売中のプラン・価格・原価を契約見積もりで確定すること**。単に月額$39でパートナーAPIを再販売できるとは判断しない。

**Totalumの移管で重要な追加発見**：v2のエクスポート・インポートAPIはユーザー/パスワード/セッションを引き継がず、DB内のユーザーに紐づく行の扱いにも制約。これは「顧客を保持したまま本人独立ホストに移行する」要件の障害になり得る。また /docs/api/github のデフォルト同期方向 totalum_to_github は、接続先リポジトリの develop/main 内容を**置換する**と明記。既存のMake-money repo、運用中のrepoへ接続してはならない。別の使い捨て検証専用repoでのみ実験する。

**事実として未証明**：日本の個人制作者が本人名義でAI生成会社と直接課金契約しつつ、Makerの自社画面から事業アプリの作成・修正を行う公式の認証委譲API。見つからないことと技術的に不可能であることは違う。契約書面・認証した実例の両方が必要。

## 3. ホスティング、顧客DB、撤退時の独立

| 論点 | 確認できた条件 | 採用方針 |
|---|---|---|
| Netlify | Free 300 credits/月、production deploy 15 credits、個人向けPersonalは$9/月/1,000 credits。枠超過で同一アカウントの**全サイトが停止し得る**。Functions/Database/Blobも公式提供 | 静的LPや適合するフルスタックでは、Maker名義ホストでなく**本人契約のサイト**へ公開。Freeは商用無停止・高負荷保証ではない |
| Vercel | Hobbyは規約上personal non-commercial。Proは有料。OAuth連携でユーザーによるインストール・許諾とAPI操作が可能 | 商用SaaSは本人の適正な商用プラン。DB/Auth/メール/決済も本人直接契約か本人所有の適正な外部サービス |
| 移管 | URLが独立していても、認証ユーザー、DBバックアップ、secret、コード、決済、DNS、サーバー請求主体が独立とは限らない | 退会後も本人環境のアプリが稼働し、バックアップ→復元→別ホスト運用までできることが合格条件 |
| Makerが扱うデータ | ProjectID、外部プロジェクトID、生成プロンプト/仕様、許諾・公開状態、販売者/商品情報、必要な決済識別子 | **独立SaaSの顧客パスワード、業務DB、カード番号、他人の全収益情報は保存しない** |

本人のHosting OAuthでは、Makerが「代理操作の権限」を持っても「ホスティング契約者」にはなるとは限らない。しかしMakerの不正操作・token漏洩・設計欠陥に起因する責任は別途残る。運用時にはscope、rotation、revoke、権限失効後の停止を検証する。

## 4. Stripeと収益分配：以前の想定より大きい契約リスク

**2026-09-28改定のStripe Connect—Platform Terms（公式）**では、原則として平台側がConnected Account上の取引、紛争、返金、reversal等の損失についてStripeに責任を負う条項があり、§7はStripe Managed Risk適用部分を除きその責任に上限がない旨を定めている。**Direct Charge + Seller Merchant of Record という技術構成だけで責任免除にはならない**。

Stripe Managed Risk（SMR）は例外の可能性があるが、指定の口座形態、専用の費用、Stripeによる引受対象、合意済みリスク上限の有無、解約/移行時の負担が重要。Makerの日本アカウント・想定制作者層で利用可能かは**未回答**。Stripeによる書面でのアカウント別責任表・契約・料率が揃わなければ、少人数運営のMVPに他人の決済リスクを無制限に取り込まない。

**手数料も2つの料金方式が異なる**：
- Stripeが連結アカウントに料金を請求する方式：公式Connect価格はプラットフォーム向け追加アカウント・入金手数料が原則ゼロ。ただしStripeは別途決済会社としての手数料と契約責任、アプリ開発を要する。
- プラットフォームが料金を決定し負担する方式：公式日本価格はアクティブ連結口座 ¥200/月、出金額0.25% + ¥250/入金。小額売り手では販売feeの粗利益を圧迫する。

決済処理は別途日本標準カード3.6%、Billingの従量課金0.7%などが参考。どの当事者がどの手数料を負うかを取引モデルごとに定義すること。

**単純な採算例（利益予測でない）**：3,000円/月のSaaS × Maker成約fee10% = 300円/回。1,000有料契約月でもMakerの成約feeは30万円/月の粗収入。この後に実際の決済/返金/サポート/紹介/会計費用を差し引く。仮にMakerが上記の有料Connect料金方式で売り手1人の月額3,000円の出金を1回処理すれば、公式表に基づくConnect固有の費用例は200+250+7.5=**457.5円**、300円の粗feeを超える（**この費用は料金方式を選ぶ場合のみ。標準の全取引で生じるとは断定しない**）。

**第一段階の低責任代替**：
- Marketplaceでは制作者の既存の外部購入URLへ送客し、Makerは利用者情報を最小化。Makerは自身のPRO、月額掲載/宣伝、明示的な紹介パートナー契約で収益化。
- 外部販売がMakerの成約fee対象になるとは自動的に言えない。アフィリエイト委託・規約・売上Webhook・成約照合がある場合に限り成果報酬を扱う。
- Gumroadなどには自社の会員継続課金と紹介者への継続報酬の仕組みがある。ただし利用対象、費用、日本からの出金と**SaaS自身の有料権限/認証への連携**は別の課題。Makerの全商品の汎用決済・出金・照合を自動完成させるサービスとみなさない。

## 5. 日本の適用法令と設計上の必要対応

| 対象 | 一次資料で確認できること | Makerがする/避けること |
|---|---|---|
| **有料クレジット・前払式支払手段** | 資金決済法の施行令上の適用除外に関係する発行日からの期間は**6か月**。単純に180日と同一視しない | 購入した汎用残高は利用用途、期限、払戻、退会、払戻不能残高、自家型/第三者型の別を法務確認。代替は処理単位の個別販売/料金従量型 |
| **特定商取引法** | 通販の最終申込画面に数量・価格・総額・継続・解約条件を明瞭に表示し、訂正できるようにする | PRO/追加利用、売り手のサブスク両方で販売者・役務提供者・請求主体を明示 |
| **取引DPF消費者保護法** | ネット上で売り手と消費者の契約を成立させる形態には取引DPF提供者の消費者保護対応が問題となる | 単なる外部紹介と、Maker内チェックアウトを区別。販売者表示、照会/削除、適用範囲を法務分類 |
| **景品表示法・ステマ告示** | 広告主が関与した口コミ・アフィリエイト表示の誤認防止が必要 | 紹介者の記事・有料掲載・広告を明確に識別。存在しない売上、利益、レビュー、返金保証を捏造/黙認しない |
| **個人情報保護法・AI外部送信** | 個人データを生成AIに入力する目的外利用・学習利用、海外事業者/外国第三者への提供に注意が必要 | 用途・送信先・モデル学習の有無・保持・削除・外国移転/委託を契約とUIで説明。入力を最小化 |
| **著作権/商標/素材** | 公式サイトに掲載された製品画面、画像、文章や他社商標は自由な再配布を一律には許可しない | 引用要件/素材ライセンス/個別許諾を確認し、原典の権利と検索APIライセンスを分離。申し立てから非表示までの運営手順を持つ |
| **紹介報酬・送金** | 本人確認、税務、国別送金条件、資金決済の構成による適用が変わる | Makerが他人の売上全額を預かることを既定設計としない。送金業者と日本向け出金、返金取消を実証後のみ解放 |

**上記は法令の一次情報に照らした開発上のリスク整理であり、特定の契約形態に適法性を保証する法律意見ではない**。日本法専門家にデータフロー/資金の流れ/利用規約/返金/クレジットを提示して事前審査が必要。

## 6. コンテンツ収集・商用表示の追加判定

- **検索APIは事例原本の再配布許可ではない。** Brave Search API の公式Searchプランは$5/1,000検索・毎月$5相当無料枠（利用申込みやカード等の条件あり）。保存・検索結果の転載・商用二次利用は条件を別確認する。出典先の記事・画像の権利はまた別。
- **Google Custom Search JSON APIは新規顧客受付終了、既存も2027-01-01に終了予定**。新たな収集基盤として採用しない。
- 既存のUniversal FoundationやR2のRaw→照合→公開版の区分、発行日・出典・数値の単位・推測ラベル・商用表示権利・権利停止の伝播を維持する。候補の収集数を公開数と混同しない。
- 既存の文章品質・権利ゲートを無断で緩めず、必要なコンテンツと市場機会の更新をコホート課金価値として検証する。

## 7. 収益性・価格・市場の不確実性（推計と実測を厳格に分ける）

Starter Storyでは大量の事例を有料提供、Exploding Topics Proではトレンドデータと追跡機能を$39/$99/$249月額で販売（公式取得時点）。**これは有料情報に実在する供給市場がある証拠であり、MAKEMONEYにその価格で課金する需要や利益がある証拠ではない。**

以前の税抜限界利益の試算は、PRO 2,980円（税込）→税抜約2,709円、カード+Billing約128円、AI割当原価300円、会員別その他200円→約**2,081円/月・人**（共有調査、人件費、広告、無料利用者、失敗原価、運営法務費を含まない）。**旧3円/credit予算がAI制作1本の費用を保証しない**ため、契約APIの実請求と会員コホートを照合してから値決めする。

**確認が必要な量**：無料事例の質と公開数／自然訪問数／機会詳細の閲覧→PRO率／7・30・90日の再訪・継続／無料AI体験の失敗率と1完成物原価／本人公開完了率／マーケットプレイスでの実購入率／広告流入の獲得費用／自社サポート作業時間／トラブル原価。これらを実測しない限り、利益目標額・年間到達人数・CAC回収期間・適正価格は算定不能。

### 何を先に売るべきか（現時点の推奨）

1. PRO情報ライブラリ・更新（ユーザーが制作をしなくても課金する理由。制作会社の契約に依存しない）。
2. 原価上限が実証された個別AI調査・制作（本人への利益とMakerの限界利益が両立する場合）。
3. 売主本人が既存外部販売ページを持つ市場で、公式な紹介契約/掲載便益を提供する。顧客/取引が発生してから内部決済を追加する判断。
4. Stripe Connectや長期ロイヤリティは**相当の利益増加を実証し、契約責任を許容できたときのみ**採用。

どれも完成済みとは言わない。機能価値を廃止するのではなく、ビジネスの収益実証とリスク審査を依存順に分ける。

## 8. 既存実装の読み取り専用監査

2026-10-10のmainのファイル内容で確認：

| コード | 事実 | 何が未完成か |
|---|---|---|
| src/lib/builder/v0.ts | base URLは api.v0.dev/v2 | 別Provider選定/SDK、商用許諾、本番許容、本人契約の仕組み |
| src/lib/builder/session.ts | providerは'v0'のみに固定、状態はdraft/generating/ready/error | 共通Project ID、複数Provider、本人host、許諾、版・外部更新・解除管理 |
| src/app/api/build/start/route.ts | ideaId必須、日次credits枠 | 直接自由入力、外部原価予約と原子的確定、本人所有公開 |
| src/app/api/marketplace/commerce/orders/route.ts | stripe_testは503、動作するのはtest注文 | Connect、サブスク利用権、決済/返金/出金の本番テスト |
| migrations/d1/0017_commerce_marketplace.sql | ordersはmode='test'のみ | 実際のSeller課金・決済事実・Entitlement |
| migrations/d1/0018_marketplace_distribution.sql | 外部SellRelayとの対応テーブル | 決済/紹介実接続と会計/送金を実施した証拠なし |
| src/lib/marketplace/distribution/runtime.ts | 通常はdistributionClient() = null | 実際に自動送金が動く状態ではない |

このファイル監査はコードの静的確認。現行本番の全画面ブラウザE2E・実Stripe・R2・GitHubの全PR差分をすべて試験した報告ではない。

## 9. 詳細な未決事項と実証に必要な証拠

- [未決事項MECE台帳：優先順位/誰が何をどう確かめるか](MAKEMONEY_UNRESOLVED_DECISION_REGISTER_20261010.md)
- [外部会社への確認事項とE2E受入試験](MAKEMONEY_VENDOR_CONTRACT_AND_TEST_PLAN_20261010.md)
- [オーナー意図](OWNER_INTENT.md)／[現在の計画入口](MAKEMONEY_CURRENT_DIRECTION_AND_NEXT_STEPS_20261010.md)／[過去全議論](MAKEMONEY_OCT10_COMPLETE_MECE.md)／[先行監査](MAKEMONEY_IT_DUE_DILIGENCE_DECISION_20261010.md)

### 公式一次資料・照合URL（2026-10-10確認）

**Builder**
- https://www.overskill.com/developers/partners （team/keyの発行、embeddable preview、生成、export制限）
- https://www.overskill.com/pricing および https://www.overskill.com/help/articles/overskill-plans-and-pricing （価格表示が相違するため個別見積が必要）
- https://www.totalum.app/docs/api/overview
- https://www.totalum.app/docs/api/account （v2月額hosting credit・APIでの単価照合）
- https://www.totalum.app/docs/api/transfer （認証ユーザー情報のexport除外）
- https://www.totalum.app/docs/api/github （初回syncによる既存repo内容置換の警告）
- https://www.totalum.app/docs/api/migration-v2
- https://www.totalum.app/en/whitelabel
- https://vercel.com/legal/api-terms （v0 §5, §8, §9）
- https://docs.lovable.dev/integrations/build-with-url

**Host / Payments**
- https://www.netlify.com/pricing/
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/integrations/create-integration/vercel-api-integrations
- https://stripe.com/en-jp/legal/ssa-service-terms （2026-09-28版 Connect Platform §3, §7、SMR）
- https://support.stripe.com/questions/stripe-user-terms-update-september-28-2026 （新旧ユーザーへの発効時点は異なり得る）
- https://stripe.com/jp/connect/pricing
- https://stripe.com/jp/pricing
- https://stripe.com/billing/pricing
- https://gumroad.com/help/article/249-affiliate-faq

**Japan / Data / Benchmark**
- https://www.japaneselawtranslation.go.jp/en/laws/view/4316/je （資金決済法施行令第4条第2項）
- https://www.no-trouble.caa.go.jp/what/mailorder/guidelines.html
- https://www.caa.go.jp/policies/policy/consumer_transaction/digital_platform/
- https://www.caa.go.jp/policies/policy/representation/fair_labeling/faq/stealth_marketing/
- https://www.ppc.go.jp/all_faq_index/faq1-q12-4/
- https://www.ppc.go.jp/news/careful_information/230602_AI_utilize_alert/
- https://developers.google.com/custom-search/v1/overview
- https://api-dashboard.search.brave.com/app/plans
- https://www.starterstory.com/checkout?plan=founders_club
- https://explodingtopics.com/pricing

公式公開ページと適用される個別契約/見積/地域/旧契約の関係は未確認箇所がある。リンクの存在や公開価格だけでユーザー本人の条件が確定したと誤認しない。
