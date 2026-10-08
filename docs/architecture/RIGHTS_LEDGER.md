# 出典の権利台帳（2026-10-08〜）

出典サイトごとに「使ってよいと判断した根拠」を残し、苦情・削除の依頼・規約や法律の変更に、すぐ対応できるようにするための記録。**公開を止める関門ではない。** 公開は先に出し、記録は横に残す。

オーナーの指示（原文）: 「お前の方で大丈夫なやつを選んで出すんだよ」「それらも記録してね　権利関係」「あとで誰かに何か言われたら柔軟にできるように」「法的に変わったりしたらとかさ」「今後は絶対にそれも加味して集めるようにして、できるようにして」

## 記録の置き場

| 何 | どこ | 単位 |
|---|---|---|
| 台帳（根拠・状態・証拠・履歴） | `data/source-rights-ledger.json` | ドメイン（サブドメイン込み。親があれば親にまとめる） |
| 個別の審査（allowed / held / blocked） | `data/catalog-source-rights.json` | URL（従来どおり。読む側は変えていない） |
| 標準の規則（Universal Foundation の審査） | `data/foundation-public-rights-snapshot.json` | サイトの種類（ホスト末尾で当てる） |
| 取得した出典ページの指紋 | `data/publication-evidence.json`（台帳に写しを持つ） | 事例ごと・URL ごと |
| 規約ページの本文（git 管理外） | `data/source-cache/terms/<ドメイン>.txt` | ドメイン |

台帳の1項目で分かること: サイト名と URL / 状態（使用中・使用停止）とその理由と変えた日 / 判断した日・判断した人・根拠の種類（`registry` 標準の規則、`individual_review` 個別審査、`ai_judgment` 集める段のAIの判断、`unconfirmed` 未確認）/ 3つの確認（ログイン不要・有料の壁なし・規約が引用を禁じていないか。分からなければ `unconfirmed`）と規約の URL・確かめた日 / 何を出しているか（数字と事実だけ、リンク付き、文章は写さない）/ オーナーの発言の原文 / 判断時点の規約ページと出典ページの指紋・取得日 / 変更の履歴。

公開に効くのは**状態が使用停止のドメインだけ**（`scripts/reader-case/source-policy.ts` が最初に見て不許可にする）。もう1つ、標準の規則にも個別審査にも無いサイトは、台帳が `ai_judgment` で3つとも満たす（`yes`/`yes`/`permits` か `silent`）と記録した使用中のものだけ許可する。未確認が1つでもあれば従来どおり許可しない（記録は残る）。

## 見方・使い方

```
pnpm rights:where <ドメイン>            # そのサイトが、どの事例のどの事実・数字・分析・画面の文に使われているか
pnpm rights:suspend <ドメイン> --dry-run # 使用停止にしたら外れる物の一覧だけ（何も書かない）
pnpm rights:suspend <ドメイン> --reason "理由"   # 台帳を使用停止にする（次の公開から外れる）
pnpm rights:resume  <ドメイン> --reason "理由"   # 使用中に戻す
pnpm rights:review [--fetch] [--unconfirmed]     # 見直しが要るサイトの一覧
pnpm rights:terms [<ドメイン>] [--all]  # 規約ページの指紋と取得日を台帳に記録
pnpm rights:seed [--dry-run]            # 公開中の事例が使う出典のうち、台帳に無いドメインを記録
```

## 苦情・削除の依頼が来た時

1. `pnpm rights:where <ドメイン>` で、使っている事例・事実・画面の文を見る。
2. 外す範囲を `pnpm rights:suspend <ドメイン> --dry-run` で確かめる。事例の他の部分は残る。
3. `pnpm rights:suspend <ドメイン> --reason "いつ・誰から・何の依頼か"` で台帳を使用停止にする（理由と日付と実行者が履歴に残る）。
4. 公開する。公開側の組み立て（`projectReaderCase` の `allowSource`）がそのサイトの事実・数字を外し、外れた事実を根拠にした分析と画面の文は作り直し・検査の対象になる（`docs/COLLECT_TO_UI.md` §3b の流れ）。公開・本番への書き込みはこの命令では行わない。
5. 間違いだった・許諾が取れた時は `pnpm rights:resume`。

## 法律・規約が変わった時

1. `pnpm rights:review --fetch` で、規約ページの指紋が変わったサイトを見る（毎日の定期実行 `pnpm daily:run` の `rights-review` 段と `run-daily.sh` からも呼ばれ、一覧を出すだけで公開は止めない）。
2. 変わったサイトは規約を読み、台帳の確認3つ（`checks`）を直し、`pnpm rights:terms <ドメイン>` で新しい指紋を記録する。履歴に残る。
3. 使えなくなったなら上の手順（`rights:suspend`）。法律の変更で全体に効く場合は、該当ドメインを1つずつ停止するか、標準の規則（Universal Foundation のスナップショット）側を更新する。
4. 判断から180日（`reviewAfterDays`）たったサイトも `rights:review` に出る。確かめたら `decidedAt` を更新して履歴に残す。

## 集める時・取り込む時

- 集める段（`case:research`）は、出典ごとに `rights`（`loginFree` `noPaywall` `quoteTerms` `termsUrl` `note`）を書く（`scripts/reader-case/collect-prompt.md`）。判断できない所は `unconfirmed`。
- 取り込む時（`add-entity-records.ts --from-research` と `--apply`、`import-case-rebuild.ts`）に、台帳に無いドメインがあれば自動で欄を作る（根拠が無ければ未確認。失敗しても取り込みは止めない）。
- 3基準のどれかが `no` / `prohibits` と判断された新しいサイトは、使用停止で記録される（記録は残り、その事実は画面に出ない）。標準の規則か個別審査がある場合は、そちらを優先し、AIの判断はメモに残るだけ。

## 注意（既知）

- 個別審査（`catalog-source-rights.json`）の `recheckAfter` が過ぎると、そのURLは不許可になる。`rights:review` が期限切れ・30日以内を出す。
- 不承認（held / blocked）の URL は、同じドメインの許可済みの URL を巻き込まないため、台帳には載せない（URL 単位の記録が正本）。
- 台帳の確認3つのうち、登録時点で確かめられたのは「ログイン不要」（取得記録から）だけ。有料の壁と規約の引用禁止は未確認として残してあり、`rights:review --unconfirmed` で一覧できる。
