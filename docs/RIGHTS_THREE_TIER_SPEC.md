# 権利3層モデル 仕様（2026-09-29 オーナー決定）— Universal Foundation 登録簿への適用手順

この文書は Make-Money 側の正本メモである。実際の登録簿（`salve-de/universal-foundation` の `registry/rights/`、`registry/sources/`、`registry/public-facts/`、`docs/AI_RESEARCH_PUBLICATION_RULES.md`）への変更は、オーナーまたはオーナーが許可したセッションが branch を作って行い、PR で取り込む。本セッションでは自動承認が下りなかったため未適用。

## 1. 決定

「明示の許可が無ければ止める」から「3層」へ移行する。法的根拠は `docs/COMMERCIAL_RIGHTS_PUBLICATION_HANDOFF.md` の 2026-09-28 解釈と同じ（事実・データは著作物ではない。規約が縛るのは取得方法と表現・媒体の再利用）。法的助言ではなく運用方針。

| 層 | status | 対象 | 表示できるもの | 表示できないもの |
|---|---|---|---|---|
| 1 自動OK | `approved` | 公的開示・統計（既存）、公式サイト（entity-bound）、プレス配信、アプリストア、GitHub | 事実・数値（出典名・URL・日付付き） | 原文の転載、他者の媒体 |
| 2 事実のみOK | `restricted` | 報道、インタビュー、ニュースレター、コミュニティ投稿 | 自分の言葉にした事実に出典名・URL・日付。本人が述べた数字は「本人申告」ラベル | 本文、長い引用、スクショ、画像、図表、表のコピー。原文保存は metadata_only |
| 3 完全NG | `blocked` | LinkedIn、有料本文、人物写真、他社図表、SNSスクショ、個人データ、非公開画面 | なし | 全部 |

## 2. decisions の値

Tier 1: `private_raw_storage=allowed, retention=allowed, commercial_use=allowed, ai_processing=allowed, public_display=allowed, redistribution=blocked, automated_collection=allowed, public_fact_display=allowed, public_excerpt_display=restricted, public_media_display=restricted`（アプリストア・GitHub は media=blocked）。attribution: "Provider name + canonical URL + publication/retrieval date."

Tier 2: `private_raw_storage=metadata_only, retention=restricted, commercial_use=restricted, ai_processing=allowed, public_display=restricted, redistribution=blocked, automated_collection=blocked, public_fact_display=restricted, public_excerpt_display=blocked, public_media_display=blocked`。attribution: "Provider name + canonical URL + publication date; figures stated by the subject are labeled self-reported (本人申告)."。notes に必ず次の条件文を入れる: "Tier 2 (facts only): an independently worded factual proposition or number may be displayed publicly when it carries provider name, canonical URL and publication/retrieval date, and (for figures stated by the subject) a self-reported label. No article prose, quotation beyond a short attributed phrase, screenshot, image, chart, or copied table. Raw bodies: metadata_only going forward; previously stored private raw bodies stay private and are never published."

Tier 3: 全 decision `blocked`。

## 3. 追加・改訂するレコード

新規 Tier 1（source + policy v1）: `src.official-company-website`（entity-bound host。provider_url はプレースホルダ `https://official-website.entity-bound.invalid/`、runtime が entity の公式ドメインに束縛）、`src.press-release-wires`（prnewswire.com, globenewswire.com, businesswire.com, prtimes.jp）、`src.app-stores`（apps.apple.com, play.google.com。media=blocked）、`src.github`（github.com。media=blocked）。

新規 Tier 2（source + policy v1）: `src.hacker-news`、`src.x-twitter`（x.com, twitter.com）、`src.youtube`、`src.niche-pursuits`、`src.starter-story`、`src.substack`、`src.beehiiv`、`src.reuters`、`src.bloomberg`、`src.nikkei`、`src.crunchbase`、`src.wikipedia`（CC BY-SA 4.0 の注記）。

Tier 2 へ改訂（v1 は残し `policy.<name>.v2.json` を新設し source の `rights_policy_ids` に追加）: indiehackers, ebizfacts, reddit, techcrunch, product-hunt, etsy。

Tier 3: linkedin は据え置き。catch-all として `src.paywalled-and-private` / `rights.paywalled-and-private.v1`（status blocked、notes に「決して出さないもの」を列挙）。

公開事実型: `registry/public-facts/fact.self-reported-business-metric.v1.json`（`fact_type_id: fact.self_reported_business_metric.v1`、`value_kind: money`、scope company/product/other、relations direct_entity/owner/issuer、display title "Self-reported figure"。notes: 本人申告ラベル・発言日・対象期間・出典リンクが必須、独立検証を主張しない、出典ページの権利は付与しない）。

reviewed_at は `2026-09-29T09:00:00+09:00`。terms_urls は各社の規約ページ（未確認のものは notes に "Terms URL to confirm on first use." と書く）。全ファイルを `schemas/registry/*.schema.json` で検証してから commit する。

## 4. 規則文書の改訂

`docs/AI_RESEARCH_PUBLICATION_RULES.md` の 1, 2, 3, 4, 5, 8, 11 節を3層に書き換え、冒頭に "2026-09-29: three-tier model adopted by the project owner; supersedes the 2026-09-25 fail-closed default." を追記。新設 "13. Accuracy over rights"（識別可能な人物・会社に根拠のない売上・利益を付けることが最大の法的リスク。表示する数字は必ず出典・期間・reported/estimated/unknown ラベル付き。根拠のない旧数値は未確認として表示する）。`registry/rights/README.md` の Publication rule と Default behavior を、未審査プロバイダは事実は Tier 2 扱い・媒体と引用は Tier 3 扱いに改める。

## 5. Make-Money 側で続けて必要な実装

1. `data/foundation-public-rights-snapshot.json` を UF の確定 commit から再生成（Tier 1 と Tier 2 の policy/source を含める）。
2. `src/lib/foundation/publication-rights.ts` で `status=restricted` かつ `public_fact_display=restricted` の policy を「事実のみ・出典表示必須」として通す（原文・媒体は通さない）。
3. `fact.self_reported_business_metric.v1` を Public Fact の型登録簿に追加し、UI で「本人申告」ラベルと日付・リンクを必須表示にする。
