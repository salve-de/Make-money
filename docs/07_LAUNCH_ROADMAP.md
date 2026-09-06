# 公開ロードマップ

## Phase 0 — 旧実装で確認済み

- 全主要画面
- デモDB
- 検索、フィルター、保存、追跡、比較
- 投稿、Claim、需要投票
- 掲載者ダッシュボード
- PWA
- テスト、CI
- 旧Supabase向けデータモデル資産（本番採用は廃止）
- プロダクト・運用文書

## Phase 1 — 本番基盤へ統合して初期公開

### アプリ/インフラ

- PR #2のNext.js方向を正本として実装を完成させる
- TypeScript + Next.js App Routerへ統一
- Cloudflare Workers向けビルド/デプロイを構築
- Workers Static Assets / Custom Domainを設定
- Neon PostgreSQL + Drizzle schema/migrationを実装
- Firebase Authを実装
- Firebase認証 -> server authorization -> NeonのE2Eを通す
- Stripeの決済/Webhook基盤を実装
- R2はオブジェクト保存が必要な機能だけ接続
- 重い処理が必要な場合だけCloud Run / Jobsへ分離
- 旧Supabase依存を本番コードから除去

### データ

- 30件の強いOpportunity
- 100件以上のMoney Signal
- 100–300件の既存サービス
- 30件以上の未充足需要
- 各Opportunityへ最低2件の根拠
- 共有可能な調査・根拠データは`universal-foundation`の契約を正とする

### 品質

- 体験用数字をすべて削除またはデモ表示へ限定
- URL、調査日、金額タイプ、Evidence gradeを確認
- 成功例だけでなく失敗・撤退も追加
- Next.js production build成功
- Cloudflare Workers compatibility/build成功
- 主要認証/投稿/保存/ClaimフローE2E成功
- バックアップ・復元経路を確認
- 独自ドメイン、HTTPS、エラー監視を確認
- プライバシー、利用規約、問い合わせを整備

## Phase 2 — 需要と掲載の循環

- サービスClaim
- 未充足需要投票
- ベータ利用者募集
- 投稿審査管理画面
- 公開コレクション
- 共有カード生成
- 週刊ダイジェスト
- 掲載者向け実アクセス分析

成功判定：掲載者が外部からユーザーを連れてきて、需要ページから別のサービス利用が生まれる。

## Phase 3 — 有料化

- 保存・追跡上限
- 市場変化アラート
- 詳細根拠・履歴
- 高度比較
- CSV
- Radar Pro / Research
- Stripe決済・契約状態同期

成功判定：無料の夢・発見を壊さず、監視と調査時間短縮へ継続課金が発生する。

## Phase 4 — データネットワーク

- 公的API・企業開示ETL
- 価格・採用・買収・調達・需要の時系列
- Opportunity Gapの自動候補
- 発掘者信頼スコア
- 匿名Intent
- API・チーム機能
- 重い取得・解析処理はWorkersに押し込まず、必要性に応じてCloud Run / Jobsへ分離

## 初回公開前チェック

- [ ] Next.js + TypeScript実装が正本になっている
- [ ] Cloudflare Workersへ本番相当デプロイ成功
- [ ] Pages / Tunnelを通常公開経路として誤使用していない
- [ ] Supabaseの本番依存が残っていない
- [ ] Neon migrationの適用・復元手順を確認
- [ ] Firebase Authのログイン/ログアウト/権限境界を確認
- [ ] Stripe Webhook署名・重複配送対策を確認
- [ ] すべてのデモ値を確認
- [ ] 主要30金脈の根拠を二者レビュー
- [ ] 外部データの利用条件を記録
- [ ] スマートフォン実機確認
- [ ] 404、空状態、通信失敗
- [ ] 投稿スパム対策
- [ ] 削除・訂正手順
- [ ] バックアップ・復元テスト
- [ ] メール配信同意
- [ ] 広告・アフィリエイト表記
- [ ] 成功保証ではないことを明記
- [ ] 課金前に返金・解約条件を確定
