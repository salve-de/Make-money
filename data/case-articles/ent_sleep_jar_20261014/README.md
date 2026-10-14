# Sleep Jar｜新規1事例の調査・編集・図解パッケージ（2026-10-14）

対象：**Sleep Jar**（公式 https://sleepjar.com/）  
調査対象期間：2016年の創業〜2026年10月に確認できた公開情報  
状態：**ready_for_review（本番公開・R2書込は未実施）**

## 納品物

| ファイル | 内容 |
| --- | --- |
| [research.json](./research.json) | 出典9件・調査記録39件・根拠の関連付け・権利・未解決点。本文の言い換えだけでなく元事実を保持。 |
| [article.json](./article.json) | 共通8分類（概要・仕組み・お金・集客・運営・経緯・成功／失敗の理由・出典）に沿った掲載原稿。7記事章＋出典リストを表示。 |
| [figures/sleepjar-flow.svg](./figures/sleepjar-flow.svg) | 無料利用・Alexa／スマホ・有料会員を説明するオリジナル図解。 |
| [figures/sleepjar-content-2026.svg](./figures/sleepjar-content-2026.svg) | 無料／有料の4種類のコンテンツ数を比較したオリジナル棒グラフ。 |

同時に変更した成果物：
- `data/case-articles.json`：既存の表示レンダラーが直接読む新しい事例を追加
- `data/entity-additions/gen5-case-articles.json`：新規事例の識別子と出典カードを追加
- `data/CLAIMED_TARGETS.txt`：同一事業の重複収集を防ぐ予約を追加

## なぜこの事例を選んだか

既存サンプル5件にない **「声で使うアプリ → 課金コンテンツ → 音声制作会社」**という業態。利益が公表されていない事例でも、商売の具体的な構造、料金、人数、集客の経緯、現場の仕事が分かる記事を作れるかを検証する。

**記事の主役**は、創業者が困った夜間の騒音対策から、夜中に音が止まらない有料機能を作ったこと。収益推計のための架空の採算表は作らない。

## 原典と時点（公表・本人申告を正しく扱う）

1. [Amazon Developer：2016年から2022年の事業経緯と2022年6月の有料会員](https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2022/06/nick-schwab-june-2022)
2. [Sleep Jar Premium：米国の現行価格、会員機能、コンテンツ数](https://sleepjar.com/premium)（2026年10月確認）
3. [Amazon Developer：2023年の脚本・収録・専門スタッフ](https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2023/08/sleep-stories-sleepjar-alexa-august-2023)
4. [Amazon Developer：2022年の買い物の紹介収益](https://developer.amazon.com/en-US/blogs/alexa/alexa-skills-kit/2022/11/amazon-associates-on-alexa-blog-november-2022)
5. その他の出典5件は `research.json` の `sources` と `article.json` に格納。

- **有料会員10万人超**は2022年6月の会社側説明。2026年の最新会員数を意味しない。
- 月額**3.99ドル／年額19.99ドル**は米国向け公式ページの2026年10月確認額。2022年に別額が紹介されているため、現在料金を2022年会員数に掛けて売上や利益を捏造しない。
- 公式PremiumページはJavaScript表示のため、検索エンジンで得られた2026年の内容を記録。**本番公開前に別の環境で実画面確認が必要**。
- Amazonの創業者取材は当事者提供情報であり、独立監査した売上明細ではない。
- **著作権のある製品画像は転載していない。** SVGは独自の図形と確認した数字を使って制作。出典の自動取得・有料配信などの商用権利については別途審査する。

## 編集で行ったこと

- 情報の優先順位：10時間の連続再生・有料化、2022年会員数、最初の4年の集客、専門家による音声制作を優先。
- 章間の重複：年表は出来事だけ。具体的な集客は「集客」、音声の制作手順は「運営」、収益は「お金」に集約。
- 図表：仕組みの理解には関係図、無料と有料の具体的な差には比較グラフを選択。利益やMRRの推移グラフは原典数値がなく作らない。
- 未掲載資料：有料アラーム商品や人数解釈の違いなどは調査・編集記録へ残した。

## 完了と未完了

**作成済み：** 原典調査、39記録、7記事章、出典、SVG2点、既存のcase-article形式への変換、目録向けステージング。

**公開前に必要：**
- 公式Premiumページと権利条件の独立確認
- 別担当による全文と出典・図内数値の照合
- `pnpm case-articles:build --check`、lint、型・既存UI表示のCI検証
- 実際のiPhone/Safariを含む画面確認
- オーナーの承認と既存公開ゲート。今回は `approved` へ上げない

この事例の作成自体では **main、Cloudflare R2、本番公開、料金・外部契約、定期収集の設定を変更していない**。
