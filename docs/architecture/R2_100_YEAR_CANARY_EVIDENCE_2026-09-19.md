# R2作成専用Canary証跡（2026-09-19）

- 実行: `pnpm r2:100-year:canary`
- 対象: `foundation-lake/ops/100-year-canary/create-only-v1.json`
- 初回PUT: `CREATED`
- 同一内容の再実行: `EXISTS_IDENTICAL`
- 別内容の同一キーへのPUT: `R2_OBJECT_CONFLICT`として拒否
- 初回・再実行のreadback: バイト数・SHA-256ともに一致
- 衝突試行で別内容のPUTは発生していない

このオブジェクトは運用検証の証跡としてLakeに残す。削除や上書きによる後処理は行わない。
