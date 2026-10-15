# 2026-10-15｜毎時事例収集・R2納品の復旧検証（非公開運用）

この文書は**実測結果と未完了条件の区別**を目的とする。正規の事例公開・取り込み承認ではない。収集領域・既存本番データ・Plausible Analyticsの内容承認は変更しない。

## 確認済み

- Web ChatGPTから非公開R2への直接保存・readbackは実測成功。The Million Dollar Homepage の読者向け記事7章、研究記録24件、出典8件、SVG2点を含む31,192バイトの原本を `30a3b465fd69247d2d5504466fed21ff71389cfcd322c41f29fd4ff357561d96` で読み戻している。この記事は未監査・UI未取り込み・未公開。
- 2026-10-15 11:52 JST頃、**ChatGPT Scheduled Task自身から**既存 MAKEMONEY_R2.saveMakeMoneyJson で175バイトの合成テストJSONを保存し、SHA `d6dc2ce44e85f8c81df8e58305425b6ff378fe8d20812cdcaaaf4ddd96ead122` により別の操作でreadback・一致確認した。これはScheduledからのプラグイン書込みが全面禁止ではないことの実測根拠。ユーザー向け記事の保存成功は証明していない。
- 直後の6,000文字／30,000文字合成データによるScheduled試験は実行されたが、事前に予測したSHAではreadMakeMoneyJsonが `Delivery not found` を返した。各テストで実際に呼ばれた操作・生成文字列・返却SHAは未取得であり、サイズ制限や安全拒否を原因として確定していない。
- 以前の毎時収集では Pura Vida Bracelets の記事・研究作成後に保存が拒否され、Scheduled Task自体が無効化された。実行記録から直接の無効化主体・原因は未確定。
- 2026-10-15 11:59 JSTに既存の毎時タスクを**再有効化**し、外部保存失敗時はそのrunだけBLOCKED/FAILEDとし、タスク自体を止めない運用規則を追加した。複数時間にわたる継続成功・実記事のScheduled R2納品は未確認。
- 既存の別経路 `r2-writer/worker.ts` は `wrangler.r2-writer.jsonc` で `FOUNDATION_R2_WRITER_ENABLED=false`、Cronなし。旧Publisher系と競合するため、これを自動的に有効化して解決した扱いにしない。

## 品質・データ境界

- 一次調査と同時に掲載用の自然な日本語原稿、必要な図解の実データを作成する。後から事実断片を機械的に接合しない。現在の表示分類は概要・仕組み・お金・集客・運営・経緯・成功／失敗の理由＋出典。
- 出典URL、出典日・アクセス日・出来事時点・権利、recordKey/sourceKey、ID、別名、公式ドメイン、版、日時、未確認事項、重複検査範囲を保存。過去の約2000件超とPlausible以外の新規事例は**すべて未審査**。
- `saveMakeMoneyJson` はSHAによるwrite/readbackのみを持つ。事例名での全件検索、予約ロック、取り込み済みカーソル、承認状態更新APIはない。R2受領SHAをGitHub追記専用台帳に書けても、それは「納品を把握した」だけで、UI取り込み・監査合格・本番公開ではない。
- ChatGPT automationからのGitHub受領書書込みは未確認。実行拒否があっても別経路への書込みや権限緩和で安全機構を回避しない。拒否の正確な段階と理由を保存する。

## 合格条件（別々に追跡）

1. SCHEDULE_LIVENESS: 少なくとも連続した複数の自然scheduled runでタスクが有効のまま実行される。
2. R2_SAVE_READBACK: 実際の読者向け記事と図表を非公開R2へ保存し、返却SHAによる読み戻し一致が成立する。
3. HANDOFF: GitHub専用受領書をcreate-only保存し同一ref/pathから読み戻す、または契約で認めた一覧可能な保存経路で他AIがSHAを発見できる。
4. INDEPENDENT_QA: 独立の原典・権利・内容・表示監査（未実行はNOT_RUN）。
5. LOCAL_UI_IMPORT: 承認前プレビューで実記事と図表が欠落や横溢れなく表示される。公開目録に勝手に登録しない。
6. OWNER_APPROVAL: Plausible以外はオーナーの個別レビューまでFALSE。
7. PUBLICATION: 新規はすべて禁止。手動の別の明示決定が必要。

## 運用メモ

- GitHub Actions、Neon、既存の本番R2公開領域、公開目録、公開ポインタ、無断Cloudflare deploy、新しい外部AI API課金を禁止。
- 保存成功とScheduled Taskの成功、GitHub受領、UI取り込み、公開を混同しない。
- 外部アクションの安全チェック拒否が起こった場合、同一実行内で内容・サイズ・経路を変更して回避する試行をしない。
- 6時間ごとの独立監視は毎時収集タスクの有効状態・新受領書・実R2 readback・記事と図の品質を検査する。収集タスクが止まった場合は停止主体が未確定なら独断で再有効化せず、事実を通知する。
