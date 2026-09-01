# 法務・公開チェックリスト

> 法律相談の代替ではない。正式公開前に、対象国・収益形態・データ源に応じて専門家の確認を受ける。

## 1. 表示・広告

- [ ] 「このサイトを見れば儲かる」と利益を保証していない
- [ ] 売上、利益、GMV、資金調達、契約上限、推定値を明確に区別している
- [ ] 推定値は推定と表示している
- [ ] 自己申告は自己申告と表示している
- [ ] 有料掲載は「プロモーション」と表示している
- [ ] 広告費でOrganic順位を購入できない
- [ ] Affiliate Linkは明示している
- [ ] Sponsored Contentと編集記事を分けている
- [ ] 過度な希少性・残り時間を捏造していない
- [ ] 収益事例に対象期間・通貨・費用除外の有無を表示している

## 2. 利用規約

最低限含める項目:

- サービス内容
- アカウントと認証
- User投稿の権利と責任
- 禁止行為
- Spam、虚偽、なりすまし
- 事業機会・金額情報の非保証
- 投資・税務・法務助言ではないこと
- Service Listingと第三者取引の責任範囲
- Review Policy
- Moderationと削除
- 有料プラン、更新、解約、返金
- Intellectual Property
- Disclaimer
- Limitation of Liability
- Governing Law / Jurisdiction
- 規約変更
- 問い合わせ

## 3. プライバシーポリシー

- [ ] 取得する個人情報を列挙
- [ ] 利用目的を列挙
- [ ] Auth、Supabase、Stripe、Resendなど委託先を記載
- [ ] 国外移転がある場合の説明
- [ ] Cookie / Local Storage / Analyticsの説明
- [ ] Listing Applicationの連絡先共有範囲
- [ ] Newsletterの確認・解除方法
- [ ] 保存期間
- [ ] 開示・訂正・削除窓口
- [ ] Security Incident時の対応
- [ ] 未成年者の扱い

## 4. User投稿

投稿者へ確認させる事項:

- 公開する権利がある
- 個人情報・秘密情報を含めない
- 数字の種類と期間を偽らない
- 他人になりすまさない
- 自分・勤務先・競合などの利害関係を開示する
- 証拠のない収益保証をしない
- 違法商品・権利侵害商品を掲載しない

運営者側:

- [ ] Notice & Takedown窓口
- [ ] 訂正申請
- [ ] 投稿履歴・審査履歴
- [ ] Repeat Infringer Policy
- [ ] Spam / Bot対策
- [ ] 違法コンテンツの対応基準

## 5. データ利用権

各データ源について確認:

- API利用規約
- Commercial Use
- Redistribution
- Attribution
- Rate Limit
- Cache期間
- Derived Dataの扱い
- Logo / Screenshotの利用
- Database Right
- Robots.txtだけでなく利用規約

原則:

- 原文記事を再配信しない
- ClaimとSource URLを保存する
- 引用は必要最小限
- 有料DBの内容を無断再販売しない
- ScreenshotやLogoは権利と用途を確認する
- 公的データも個別のLicenseを確認する

## 6. 課金

- [ ] Price、税、更新周期をCheckout前に表示
- [ ] 自動更新を表示
- [ ] 解約方法を表示
- [ ] Billing Portalを用意
- [ ] Refund Policyを表示
- [ ] Trial終了日と課金開始を表示
- [ ] Stripe Webhookで状態を同期
- [ ] 解約後の機能停止時点を定義
- [ ] Invoice / ReceiptをStripeで提供
- [ ] 日本向けの場合は特定商取引法表示の要否を確認

## 7. Marketplace

GOLDMINE RADAR自身が契約当事者になる範囲を明確にする。

初期方針:

- 募集発見と連絡の入口を提供
- 契約、納品、代金、紛争は当事者間
- 投資仲介・M&A仲介・人材紹介を無許可で行わない
- 規制業務は外部の適格事業者へ送客
- Escrowや手数料徴収は法務確認後に導入

確認が必要な領域:

- 有料職業紹介
- 金融商品・投資勧誘
- M&A仲介
- 暗号資産・決済
- 資金移動・Escrow
- ギャンブル・宝くじ
- 医療・法律・税務
- 政府調達の代理

## 8. Review Policy

- [ ] 実利用、試用、導入検討を区別
- [ ] 販売者、従業員、競合、Affiliateを区別
- [ ] Incentivized Reviewを表示
- [ ] 具体的利用状況を要求
- [ ] Rating操作を禁止
- [ ] 批判的Reviewを理由なく削除しない
- [ ] 個人攻撃・秘密情報は削除
- [ ] Product Ratingから利害関係Reviewを除外

## 9. 公開コピー

使用可能:

- 「実際に金が動いた証拠から探す」
- 「次に狙える事業機会を比較する」
- 「自分に合う入口を見つける」
- 「数字の種類と根拠を確認できる」

避ける:

- 「必ず儲かる」
- 「億万長者になれる」
- 「損しない」
- 「今すぐ買わないと手遅れ」
- 根拠のない「日本初」「No.1」
- 資金調達額を売上として見せる表現

ユーザーに大きな可能性を感じさせることと、成果を保証することは分ける。

## 10. 公開承認

正式公開のGo条件:

- [ ] 利用規約
- [ ] プライバシーポリシー
- [ ] 特商法等の必要表示
- [ ] 問い合わせ窓口
- [ ] 訂正・削除窓口
- [ ] 初期データの権利確認
- [ ] Payment Test
- [ ] Email Opt-in / Unsubscribe Test
- [ ] RLS Test
- [ ] Backup / Restore Test
- [ ] Incident Runbook
- [ ] Monitoring
- [ ] Cookie / Analytics Consentの要否確認
- [ ] 本番コピーの誤認チェック
