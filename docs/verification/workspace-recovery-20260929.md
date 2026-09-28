# Make-Money 全ローカル保全・統合記録（2026-09-29）

## 結果と境界

- 稼働コードの基準はGitHub `main`。UI復元はPR97、履歴保護・公開分離の追加修正はPR98。
- 存在する21作業ツリーを監査。旧8ブランチの有効な機能はmainに採用済み／同等実装を確認。旧UIや旧データでmainを巻き戻さない。
- 公開可能な6履歴はGitHub `recovery/20260929/*` タグへpush。旧台帳を含む履歴、stash17件、復旧refs、reflogの到達オブジェクト、未完調査は非公開R2へ保存。
- GitHubはPUBLIC。原本HTML・私的研究履歴・未照合候補を公開リポジトリに追加しない。
- `data/incoming/reaudit-*` と調査reportsの9ファイルは未完候補。非公開復旧コミット `0217715266474fb4e4854eada726e0b050f6ef59` に保全。サービス用台帳へ未取り込み。作業ツリーのファイルは継続調査のため維持。
- 資格情報を含む設定3件はバックアップ対象外。新PCではプロバイダーへ再認証して再設定する。依存・build/test cacheは再生成対象。これはPC全体、ブラウザのlocalStorage、クラウド本番DB全体のバックアップではない。

## 非公開の復旧先

Bucket: `make-money-production-private`

Prefix: `backups/workspace/2026-09-29/eef4e3a8-560b-4233-9514-350a6c06f81e`

r2.dev公開アクセス無効、カスタムドメインなしを現時点で確認。各objectは新規世代の未存在パスへ保存し、GET後のSHA-256一致を検証。

| ファイル | bytes | SHA-256 |
|---|---:|---|
| `previous-recovery.tar.gz` | 17545791 | `f96a8da7050bf0429e148c604fae6f2317de07600f7ab11e19a04bfe8dc744cf` |
| `local-assets.tar.gz.part00` | 188743680 | `abfddf1eddd0276ea24bac27860a82dc89686632fba8d2b886c58fad14de2bdc` |
| `local-assets.tar.gz.part01` | 164675513 | `f130f52d2b2226e5b9c85249b62559672def973972c9b307b85a53e5ca9f42ba` |
| `history-final.bundle` | 111498819 | `9ad0985d6a38c85637bc23cc0c1058b19802bc074acef412e96c9b40324c631c` |
| `reflog-history.bundle` | 113083484 | `0bdb88b631bf963a9251f7921db7929f418ad1bab3137588be7bbe0f0e1cde81` |

| `runtime-databases.tar.gz` | 12500 | `83dc19478e6a7b4781fde1cb3e6bd005e527f180da980b004233f32cc851aa94` |

## 何が入っているか

- `runtime-databases.tar.gz`: .wranglerのD1/R2/KV開発状態。31個のSQLiteをbackup APIで整合したスナップショットにし、remote readback後に全31DBのintegrity_check成功。WAL/SHM単体のコピーに依存しない。
- `reflog-history.bundle`: refs全体とreflogのGit履歴。公開main外の過去作業・研究snapshotも含む。非公開のまま扱う。
- `history-final.bundle`: 上記より前の追加保全世代。
- `previous-recovery.tar.gz`: 前回の差分保全一式。432 archive memberのSHAを検証済み。
- `local-assets.tar.gz.part00` + `part01`: ローカル限定の原本・資料・作業成果。結合後tar内 `manifest.json` に復元元pathとSHA。2,554 path / 1,274 unique blobsの内容一致を検証。

## 新PCでの復元

通常の開発はGitHub mainをcloneし、lockfileどおり依存を入れ、プロバイダーの認証を再設定する。

過去・未完作業の復旧はCloudflareへログインし、上記prefixから必要なobjectを取得する（CLIの取得例は公式R2ドキュメントにも記載）。

```sh
pnpm exec wrangler r2 object get make-money-production-private/backups/workspace/2026-09-29/eef4e3a8-560b-4233-9514-350a6c06f81e/reflog-history.bundle --remote --file reflog-history.bundle
git clone --mirror reflog-history.bundle recovered.git
git --git-dir=recovered.git fsck --full
```

研究途中の9ファイルは `git --git-dir=recovered.git show 0217715266474fb4e4854eada726e0b050f6ef59:<path>` で取得できる。公開mainへの一括pushや未監査候補の自動インジェストはしない。

資料は分割ファイルを順番に結合してtarを開き、`manifest.json`のpathへ対応する`blobs/<sha256>`を戻す。未知の既存ファイルを上書きせず、まず空の復旧ディレクトリへ復元する。

## 検証の読み方

PR98の必須CIが当該コードの品質証拠。保全の証拠は上表のremote readbackと、独立ディレクトリでのbundle復元・Git fsck・assetハッシュ照合。保全は調査内容の正しさの認定や本番デプロイを意味しない。

## 過去8ブランチの採否


No newly necessary main-code integration identified. Most commits have patch-equivalent main commits. Remaining differences are superseded design, historical repair implementation, debug experiment or old catalog snapshots. Preserve history remotely separately from active main if desired; do not merge those branch trees into approved UI/main. Preservation is not publication/financial verification of old data.

| Branch / tip | Disposition and evidence |
|---|---|
| codex/financial-reconciliation-audit /6307d37b | Incorporated: both commits have git-cherry `-` against main. Report, audit script, test, financial-integrity are byte-identical. Only current financial-reconciliation implementation differs because main now deduplicates source cards/observations by stable IDs; reverting would reintroduce duplicates. No adoption. |
| codex/local-integrated-20260920 /2302c735 | Historical merge + WIP39992770. R2 preservation/canary/restore scripts and5 R2 operating documents, bookmark store/test, registry page are identical main. Earlier UI/navigation/filter/Synthesis and registry implementation evolved in main. Prior worktree audit and consolidation doc explicitly accounted for these. Keep merge history as recovery; no whole-tree merge. It also makes WIP's old data reachable even if final merge tree corrected data. |
| codex/local-pipeline-acceptance /cc6e2e41 | Incorporated: all4 commits git-cherry `-`, including date-preservation, full catalog coverage/paging, unknown financial propagation. Catalog audit scripts/docs and financial tests/helpers byte-identical. Current paging/public rights/new UI are later refinements. No adoption. |
| codex/local-wip-snapshot-20260920 /39992770 | Historical WIP, also ancestor of local-integrated. Useful R2/bookmark work retained main. Reject old UI, mass-polish scripts and full catalog replacement; these can restore obsolete presentation and unsupported financial statements. Preserve as historical artifact, not active source. Additional old data publication review required; see below. |
| codex/q42-normalized-join /aa933d44 | Four of5 commits git-cherry `-`. Remaining68ed4952 only bumps writer v19→v20; main already v20. scheduled-r2-handoff source/test and writer test byte-identical. Worker differences are later main refinements. No adoption. |
| codex/r2-history-reconciliation-20260921 /8f2d7e05 |20/21 commits git-cherry `-`. Remaining2553db13 view correction patch evolved in main: evidence correction control/read/rebuild paths remain (make-money-view.ts correction prefix and readEvidenceCorrectionControl/read-time application).13 recovery/candidate/null-default/explicit-field helper/test files byte-identical. Branch version removes current rights projection, bounded list reads and serving cursor exclusions if replayed wholesale. Preserve history; reject tree replacement. |
| codex/r2-scheduled-handoff-recovery-20260921 /219f83a8 | Original large recovery patch not patch-identical, subsequently decomposed/refined. audit-scheduled-handoffs, writer-budget, writer-correction, scheduled-structured tests identical main; AsyncLocalStorage invocation scoping still implemented in cloudflare.ts; queue-audit correction and writer serving projections remain and are covered by later history branch. No missing independent function found. Do not replace modern writer/rights/scope code with old snapshot. |
| test/codex-serving /7aeb8893 | Reject runtime adoption: temporary console logging plus direct initial fetch100 rows, unchecked casts and bypass of existing pagination loader; current guarded parsers/paging supersede it. Recovery-only branch, no functional value to merge. |

