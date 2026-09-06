# 情報端末の再設計 / 2026-09-06

## 目的と判断
誰が・誰から・何を売り・どう集客し・いくら残すかを探して比較する。検索結果と詳細を独立させ、表示面積を情報に使う。データ、認証、APIは保全し、新しい画面コードとスタイルはゼロから構築する。

## 参照と採用
- https://carbondesignsystem.com/components/data-table/usage/ : 一覧に十分な幅、列ソート、検索と複数選択の操作を一箇所に集約。
- https://pitchbook.com/help/create-save-use-lists : 企業を固定する保存リストと、条件を再実行する保存検索を分離。
- https://help.alpha-sense.com/hc/en-us/articles/54133001189907-AlphaSense-Financial-Data-Sources : 数字と出典を結びつける。ただし既存データには資料URLがないため出典未登録と明示。
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ : Escape、初期フォーカス、フォーカス復帰。HTML dialogを採用。
- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html : 320pxでも本文の横スクロール不要。比較表のみ局所スクロール。
- https://design-system.service.gov.uk/components/table/ : 数値右揃え、明確な列名。

## 全機能の処遇
|既存|新構成|
|---|---|
|TERMINAL / FINDER / EXPLORE|事業データベース。検索・条件・並び順・ページをURL保持|
|企業ドシエ|URLで直接開ける独立詳細。収益構造、損益、集客、道具、リスク、出典|
|IDEAS_VAULT|事業アイデア。構想であることを実績と区別|
|PORTAL / RADAR / SIGNALS|市場調査。更新日のない情報を最新・リアルタイムと称さない|
|COLLECTIONS / LIBRARY / bookmarks|端末保存。企業・検索条件を復元、解除。アカウント間混在を防止|
|LEADERBOARD|一覧の売上・利益率・人数・資本順で代替|
|比較|選択企業を共通の行で比較、個別解除、URLで再表示|
|出力|現在の絞り込み結果のCSV。実装のないボタン禁止|
|認証 / PRO|アカウント画面へ集約。実際の認証・決済APIを利用。決済操作はQAで実行しない|
|/finder|新一覧に接続|
|/success|成功をURLだけで断言しない画面へ|
|/api/businesses|既存契約を保全。別のcatalog APIで小さい一覧と詳細を分離|
|/api/bookmarks /user/me|API保全。端末保存とクラウド保存の混同を除去|
|/api/checkout /webhooks/stripe|既存契約保全|
|/api/submissions /newsletter/subscribe|API保全。公開投稿・メール送信は実施しない|

## データと規模
terminalDataを企業画面の既存入力とする。businessesの重複数字は無根拠に混ぜない。ideasDataとportalSignalsは別種の記録。全企業詳細を初期JSに含めず、サーバーで検索・ソート・ページ切り出し、詳細は必要時取得。1000社の合成データによる検索・ページテストは実データに混入させない。

## レイアウト
PC: コンパクトな左ナビ、横幅を使う事業一覧、詳細は全幅。狭いPC: ナビを上段へ移し一覧幅を確保。スマホ: 企業・収益構造・主要数値を区切り線で連ねる行表示、独立詳細へ遷移。装飾カード、常設の使い方説明、空の詳細ペインを置かない。

## 受入
検索→0件解除→条件→保存検索→再実行→企業詳細→戻る→保存→再読み込み→比較→CSV。Safari本体で確認し、320/390/768/1024/1440のレイアウト、キーボード、読み込み失敗、URL直接アクセスを検証。ビルド成功をUI完成の証拠にはしない。
## 2026-09-06: localhost:3000を視覚基準とした再構築

この節は以前の全幅詳細・配色案に優先する。3000は変更せず、3020のUIのみを再構築した。

- 共通CSSを置換。コンパクトな側面ナビ、直接操作する主要条件、検索・表示切替・高密度台帳を採用。
- 営業利益額を追加。収録期間を表示し、月商への無断換算はしない。
- PCは検索結果と企業分析を同時表示。スマホは同じ検索条件を保った詳細への切替。
- 概況で商流・損益・集客・費用を集約。出典未登録は未登録のまま表示。
- 参考: https://pitchbook.com/help/search-results-page 、https://www.koyfin.com/help/my-views/ 、https://carbondesignsystem.com/components/data-table/usage/

検証: TypeScript、変更TSX/ライブラリのESLint、Next webpack production build成功。合成1000件の検索・ソート試験成功（本データへは混入しない）。Safari PCで22社から完全1人8社への絞り込み、選択と詳細表示、再読み込み後の営業利益表示を確認。390px詳細の初回目視後、検索領域を隠すCSSを修正したが修正後の再検証は未完了。全ページ全幅・ログイン・決済の受入試験は未完了。モック数値そのものの外部照合は今回の実装検証に含めない。
