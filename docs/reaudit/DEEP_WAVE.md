# 第2波・深掘り収集

> **2026-09-30**: Make-Money の唯一の入口は [docs/OWNER_INTENT.md](../OWNER_INTENT.md)。この文書と食い違う所は OWNER_INTENT が優先（食い違う箇所には「廃止」の注記あり）。

第1波の基本情報・料金・本人申告の報告値に、出典を読んで確認した集客、紹介経済、価格履歴、運営、依存関係、失敗、時間軸を追記する。空欄を埋めることや UNKNOWN を減らすこと自体を成功条件にしない。対象企業の既存事実を保持し、読者が事実と未確認を区別できる候補を作る。（**2026-09-30 廃止** → OWNER_INTENT 3章: 事実欄は不明のまま残し、推論欄で「推測」と印を付けて埋める）

正本: [CLAUDE.md 0–2.5](../../CLAUDE.md)、[収集マスターガイド Ⅰ–Ⅲ](../DATA_COLLECTION_MASTER_GUIDE.md)、[HANDOFF](../../HANDOFF.md)、[収集範囲](../MAKE_MONEY_COLLECTION_SCOPE.md)、[Golden schema](../GOLDEN_INGEST_SCHEMA.md)。第1波の [GEN_PLAYBOOK](GEN_PLAYBOOK.md) / [IH_WORKFLOW](IH_WORKFLOW.md) と既存 validator / ingest の契約も継承する。

## 実行境界

- 今回の試運転は IH 家系内 index 0–24 の再監査済み25件。家系で絞った後の順序を使い、ID一覧と元記録を作業フォルダに固定する。企業数不足や未再監査は黙って別企業で埋めない。
- git 書込み、カタログ直接編集、R2書込み、取り込み、他の incoming、メディア作業の変更は禁止。合成ツールはローカル候補だけを create-only で出力する。
- 候補は受入済みではない。validate PASS は形式と機械的検査の通過であり、出典の意味、商用公開、R2保存、本番表示までの完了を意味しない。
- 第1波の skeleton を再生成しない。現在の記録を複製して追加する。既存の確認済み事実や legacyDisplaySnapshot を消さない。

## 1社ごとの調査

開始・終了時刻を記録する。対象の正式URL、IH出典、既存 observationsStream / evidenceCards / temporal / operations / strategy を読み、既に確認済みの事実と不足を分ける。以下は最低限の巡回先であり、有益な事実の収集上限ではない。

| topic | 調べる場所と採録条件 |
| --- | --- |
| initialTraction | IHの製品ページから当事者の投稿へ進む。HN / Reddit / インタビュー / X / 公式の創業記録で、最初の顧客の獲得時期・人数・経路を確認。現在の広告文やローンチ掲載だけを初期獲得の成功と呼ばない。 |
| affiliate | 公式 affiliate / referral / partner ページ。報酬率、継続期間、対象、支払条件、Rewardful / FirstPromoter 等の使用が明示された範囲。制度が存在しても実際の売上寄与は別に未確認とする。 |
| pricingHistory | Wayback CDXで旧 pricing / plans / トップページの取得時刻を探し、該当スナップショット本文を読む。AppSumo等の公開LTDページも確認。現在価格との最低2時点がなければ価格「変遷」と呼ばない。単独の過去価格は時点付き観測として残す。 |
| hiring | 公式 careers と、そこから結ばれた Lever / Greenhouse / Ashby の公開求人。職種、掲載・取得時点、使用技術を要約。募集要件・歓迎スキルと、実稼働の技術構成を区別する。 |
| reviews | Trustpilot / Reddit / G2等の公開レビュー。読んだ標本件数 sampleCount と時点を必須とし、肯定・否定の両方を見て自分の言葉で要約。総投稿数と実際に読んだ数を混同しない。少数の標本を全顧客の解約率や一般的傾向にしない。 |
| platformDependency | Shopify / Chrome / Notion等の公式ストア、API・連携資料。必要となる外部プラットフォームを確認。インストール数、利用者数、評価件数を区別し、公開値には観測日を付ける。 |
| dataPortability | 公式ヘルプ・API・データ移行資料で export / delete / integrations を確認。出力形式、対象データ、制限、契約終了後の扱い。exportが見つからないことを「不可能」と断定しない。 |
| prepayment | 月払い・年払いの表示、年払い割引率、買い切り、前払クレジット、返金条件。月額換算表示と実際の請求額・期間を区別。前払い制度だけから負の運転資金や利益を断定しない。 |
| pivots | 当事者の振り返り、変更履歴、終了告知、公開アーカイブで、旧製品・失敗経路・転換時期・理由を確認。単なる機能追加をピボット扱いしない。 |
| incumbentBarrier | 大手側の料金・製品・契約と当事者の資料等。既存事業との衝突を裏付ける具体的事実がある場合だけ記録。小規模やニッチであるだけでは参入不能とは言えない。 |
| timeline | 創業、公開、調達、買収、終了の告知。出来事の日付 occurredAt と発表日 statedAt と今回の観測日 observedAt を区別する。 |
| eraContext | 当時の規制・API・流通・技術等の出典付き事実。創業年や「AIが流行した」という一般論だけで埋めない。 |
| viability | 次節の5区分。現在の機能・価格だけで収益再現性を主張しない。結論を支える過去と現在の事実を出典付きで記述する。 |
| fatalCause | 破綻・終了事例に限り、当事者の終了告知、法定資料等で原因を確認。サイトへの接続失敗は破綻の証明ではない。破綻事例と確認できなければ、その範囲を理由に記す。 |

検索で発見したページは本文を読み、同名別サービスを排除する。検索の断片だけで確認済みへ昇格しない。403 / CAPTCHA / ログイン / ペイウォール / 明示された取得禁止で止まり、その経路の制限を記録する。プロキシ・別アカウント・ブラウザ偽装等で回避しない。別の独立した公開出典を確認することは可能だが、同じ制限対象本文を別経路で取得しない。

Wayback は例えば次の公開 CDX を通常のGETで1回照会する。CDXの結果は本文を読んだ証拠ではない。HTTPエラーやアクセス制限ならそのまま未確認とする。大量の原文・画像・図表は保存しない。

```text
https://web.archive.org/cdx/search/cdx?url=<domain>/pricing*&output=json&filter=statuscode:200&fl=timestamp,original&collapse=timestamp:4
```

## 時代背景と現在判定

| viabilityStatus | 必要な根拠 |
| --- | --- |
| ACTIVE_PLAYBOOK | 事業を成立させた具体的条件が現在も存在することを確認できる資料。稼働中・売上自己申告のみでは不十分。 |
| RISING_WAVE | 当該需要・制度・市場の拡大を裏付ける期間付きの事実。新設・AI製品というラベルでは決めない。 |
| MATURED_MOAT | 既存事業者の蓄積・流通・契約等による後発制約の具体的根拠。古い会社だからとは判定しない。 |
| HISTORICAL_WINDOW | 当時成立した条件が規約・制度・API等の変更で失われたことの時点付き根拠。 |
| EVOLVING_BARRIER | 技術・費用・競争条件が変わり、従来条件では成立しにくくなった具体的根拠。 |
| UNKNOWN | 上記を支える根拠不足。欠損を誠実に残し、何を試して何が未確認か記録する。 |

機械検査は文意や情報源の信頼性を証明しない。引用・個人データ・指南文のパターン検出を通過しても、採録者による本文照合を省略しない。

判定は分析者による分類であり、将来の成功保証ではない。currentViabilityAnalysis に書く説明は出典で確認した事実に限定する。時代背景・判定の各根拠は独立した finding として保持する。既存の意味ある判定と矛盾する場合、黙って上書きしない。

## 記録の安全性と権利

- 暴露は客観的事実の記述に限る。読者への実行手順、スパム・欺瞞・違法行為の指南、テンプレ、コードは追加しない。
- 個人データ、メールアドレス、連絡先、アカウント識別子、私生活情報は今回の追記に含めない。レビューの投稿者名も不要。
- 原文を転載せず日本語で独自に要約する。本形式では逐語引用フィールドを受け付けず、本文中の15語以上の引用も拒否する。機械検査で出典との全文一致までは判定できないため、短い引用や日本語の転載も採録者が避ける。文章・構成・図表を再現しない。
- originType は `reported`（当事者・出典の申告）、`observed`（公開資料で直接観測）、`estimated`（計算式付き推計）を区別。本試運転は推測の穴埋めをしない。推計は入力・単位・期間・出典・計算式が再現可能な場合だけ別観測とする。
- rightsTier は既存の `TIER1_OFFICIAL` / `TIER1_PUBLIC_RECORD` / `TIER1_PLATFORM` / `TIER2_FACTS_ONLY` を用いる。Tierは原文転載の許諾ではない。今回の候補は事実のみ・出典表示付きで、原本保存や画像利用は含まない。
- 出典URL、観測日、分かる場合の発言・公開日を各 finding に付ける。日付不明を観測日で偽装しない。レビューは標本数、求人は求人時点、ストア値は観測時点が必要。

## JSON入力と合成

ローカル入力は `deep-wave.v1`。外部のFoundation正本スキーマを新設・変更するものではなく、既存カタログへの追記用の作業形式。

```json
{
  "schemaVersion": "deep-wave.v1",
  "records": [{
    "id": "ent_existing_id",
    "startedAt": "2026-09-29T00:00:00Z",
    "completedAt": "2026-09-29T00:03:00Z",
    "findings": [{
      "topic": "affiliate",
      "text": "公式紹介ページは紹介契約の報酬率と支払期間を公表している。ここには確認した具体値を独自の文で記す。",
      "sourceUrl": "https://example.com/affiliate",
      "observedAt": "2026-09-29",
      "originType": "reported",
      "rightsTier": "TIER1_OFFICIAL"
    }],
    "coverage": {
      "affiliate": {
        "status": "found",
        "reason": "公式紹介ページを確認",
        "attempts": [{"url":"https://example.com/affiliate","observedAt":"2026-09-29","outcome":"公開本文で条件を確認"}]
      }
    }
  }]
}
```

上は構造説明用の部分例であり、投入用データではない。実入力では14 topicをすべて coverage に列挙する。found は採用 finding がある場合だけ。`unconfirmed`（試したが未確認）には実際に試したURL・観測日・結果を記録する。`not_attempted`（未調査）、`not_applicable`（対象外）を区別する。未調査は未調査のまま区別し、架空の試行を足さない。該当しない場合は理由を明記する。

任意属性: `statedAt`、求人等の `toolNames`、年表の `occurredAt` / `eventType`、判定の `viabilityStatus`、レビューの `sampleCount`、推計の `formula`。最終的な入力検査の正本は [merge-deep.mjs](../../scripts/reaudit/deep/merge-deep.mjs)。入力と各項目の根拠は候補の `reaudit.deepWaves` にも保持する。

```bash
node scripts/reaudit/deep/merge-deep.mjs --input .reaudit-work/deep-wave/research.json --output data/incoming/reaudit-deep-ih-batch-001-20260929.json
node --import tsx scripts/reaudit/validate-candidates.ts data/incoming/reaudit-deep-ih-batch-001-20260929.json
```

合成は既存配列を保ち、同じ出典・内容・項目・発言時点を重複追加しない。同じURLにある別の事実は捨てない。observations は文字列、observationsStream は provenance 付きオブジェクトを維持する。出典URLの台帳は重複しない。旧事実と矛盾する新観測は観測ログに残し、既存の意味ある scalar を黙って消さない。

## 表示先

- observationsStream → `UniversalIntelligenceStream.tsx` の調査メモ（Layer 3）。本文・出典・観測日・検証状態を保持する。observations との同文重複は既存の mergeInspectorObservations が除く。
- evidenceCards → `dynamic-sections/DynamicEvidenceDeck.tsx` の登録済み type。初期獲得は DIRTY_GENESIS、競争条件は INCUMBENT_TRAP、死因は FATAL_BLEED、一般の確認事実は SMOKING_GUN、調査限界は UNKNOWN_AUDIT。新しい未登録 type を増やさない。
- 初期獲得 → strategy.initialTraction、確認したツール → operations.toolStack。費用不明の0は isCostUnconfirmed を付ける。
- 時代背景・判定 → temporal、年表 → timelineEvents。固定項目に収まらない事実も調査メモで保持する。
- メディアを作らず、UIコードを変えず、既存表示との整合を型・レンダリングテストで確認する。今回は ingest 禁止なので実カタログ・本番画面への反映は行わない。

## 検証と受入

1. IDと対象順序、全25件の MANUAL_REAUDIT、全topicの試行状態を照合する。
2. 現在カタログを基に create-only で `data/incoming/reaudit-deep-ih-batch-001-20260929.json` を生成する。既存の同名ファイルがあるときは上書きしない。
3. `node --import tsx scripts/reaudit/validate-candidates.ts <候補.json>` を実行し25/25 PASSを確認。既存の検査は緩めない。
4. `pnpm exec vitest run --config scripts/reaudit/deep/vitest.config.mjs`、`pnpm exec eslint scripts/reaudit/deep/ scripts/reaudit/validate-candidates.ts --max-warnings=0`、`pnpm exec tsc --noEmit --incremental false`。既存状態に起因するエラーは対象と根拠を明示する。
5. 合成前後で既存事実の保持を検査し、同じ入力の再合成で重複が増えないことをテストする。元のカタログへの書込みを行わない。
6. 項目別に採録できた企業数／未確認企業数、対象外、取得失敗理由、実測所要時間を報告する。試行数と企業数を混同しない。

将来の取り込みはユーザーの別途指示を得た上で、再度現在カタログと差分を照合し `ingest-accepted.ts` の通常経路を使用する。今回それを実行しない。候補の形状が互換であることと、R2保存・公開が成功することは別の証拠である。
