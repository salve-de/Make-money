# 個別事例の情報復元

基準: main 5e0e3116。現行カード、配色、コンパクトヘッダを維持。

| 過去の項目 | 復元先・扱い |
|---|---|
| 顧客、課題、リード、競争優位、大手のジレンマ | ExecutiveIntuitiveSummary。顧客と課題、競争優位とジレンマを択一にしない |
| 価格、利用動機 | 既存概要を維持。LTV・解約率はBusinessAnalysisSections |
| 財務本体、粗利、費用内訳 | 既存CashAnatomySection / EstimatedCashSummaryを維持。推計境界を維持 |
| 成長率、初期/現有人数、週稼働、自動化、初期資本 | FinancialOperationsSupplement |
| ツール名、分類、目的、月額、合計、URL、切替難易度 | FinancialOperationsSupplementへ一本化 |
| 顧客獲得、初動、提供構造、ターゲット、構造的摩擦 | LootBlueprintSection。部分欠損でも単独項目を表示 |
| 獲得施策、CAC、actionPlaybook、executionChecklist、連絡文面 | BusinessAnalysisSections。重複する同一手順を除外 |
| 競争/価格/継続/資金の12分析項目 | BusinessAnalysisSections。既存PRO権限とサーバー境界を維持 |
| 参入判定、理由、需要/競争変化、資本/難度/依存 | BusinessAnalysisSectionsの参入判断材料。記録された見立てとして表示 |
| 証拠カード、詳細、数値、出典、コード | EvidenceDeckSection。URLなしカードも直接到達可能 |
| 観測2配列 | UniversalIntelligenceStreamで両方を併合。文字列を確定観測に昇格しない |
| 依存PF、乗換、紹介報酬、前金、過去の失敗 | UniversalIntelligenceStreamの構造記録 |
| 初動、PF上の機会、ピボット、隠れた費用 | exposureAuditの4項目を復元 |
| 創業/初動/観測時点、時代背景、現在の有効性、年表 | UniversalIntelligenceStream。年表重複を排除 |
| 調査範囲、試行、未解明事項 | 同stream。部分データを落とさない |
| 公式URL、出典メモ、財務資料、期間、観測公開出典 | SourcesSection。内部raw metadataを公開しない |
| 関連特集/市場テーマ、メモ/AI検討、計画作成、保存/共有 | 既存を維持。メモ外側の折りたたみ撤去 |
| 前後事例、承認操作 | callbackが渡された場合のみ小さい操作として復元 |
| 顧客→提供→収益、価値経路比較 | BusinessVisualSummaryで実データに基づく図解 |
| Sankey/Waterfall/損益図 | 同visualの科目別・正負金額共通尺度図へ統合。未知を0にしない |
| TradingViewの旧月次風図 | 別科目に架空月日を割り振っていたため復活させず、正しい科目比較へ置換 |
| Flywheel | 継続/資本運用の実内容を表示。根拠のない因果循環矢印は生成しない |

## 保存・表示の境界

DB、原データ、公開権利判定、課金判定は変更しない。存在しない項目を作文しない。公開APIが非公開とした情報をフロント側から復活させない。紹介サービスの固定推薦や自動affiliateリンクを根拠なく再挿入しない。旧部品の全量貼り戻しではなく上表の情報を現行UIに統合する。

## 検証

対象コンポーネント回帰、型/lint、既存E2E、および390/768/960/1440pxの復元項目到達・パネル横幅検証を実施対象とする。実行結果はPR/CIを証拠とする。この文書だけで成功を主張しない。
