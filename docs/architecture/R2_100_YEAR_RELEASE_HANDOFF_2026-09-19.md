# R2 release引き継ぎ（2026-09-19）

## 目的

Windows側で完了したR2 releaseを、Mac側で再アップロードせずに監査・利用できるようにする。R2上の保存状態と、ローカルに残すべき正本・証跡・認証情報を分離する。

## 完了したrelease

- release ID: `reconcile-v1-080c1ec9401e40bbb29920ae`
- 正本release: `C:\Users\salve\Projects\GitHub\makemoney-latest-20260919\scratch\makemoney-releases\reconcile-v1-080c1ec9401e40bbb29920ae`
- 総数: 6,689件 / 97,896,063 bytes
- R2対象: `foundation-raw`、`foundation-lake`、`foundation-public`のみ
- 最終receipt: `...\r2-final-receipt.json`

最終結果は、new PUT 6,689、preflight existing 0、conflict 0、error 0、SHA-256/bytes readback PASS 6,689/6,689。既存キーの上書き、削除、移動はない。

## Macへ必要なもの

Git cloneだけでは`scratch/`が移らないため、将来の再監査・復元・再現性が必要なら、次をWindowsから安全なローカル転送でコピーする。

1. releaseフォルダ全体
2. `scripts\preservation\upload-entity-release-portable.mjs`
3. `docs\operations\curation-2050-audit.md`
4. このreleaseの最終receipt・Preflight・Canary・PUT進捗・readback進捗

コピー後は、releaseのファイル数・総バイト数・manifestのSHA-256を照合する。既にR2保存が完了しているため、コピー確認を目的に再PUTしてはならない。

## 認証情報

- Windows側の`.env.local`をGit、チャット、releaseフォルダへコピーしない。
- Access Key / Secret Access Key / OAuth tokenをreceiptやログへ書かない。
- Macで将来readbackを行う場合だけ、Macの秘密保管庫からプロセスへ一時注入する。
- 認証情報がない状態では、推測値やモック成功で完了扱いにしない。

## 再開ルール

- 通常はR2へ再アップロードせず、最終receiptを読み取り専用で監査する。
- receiptがない場合は、既存キーを先にHEAD/GETし、同一内容以外を検出したら停止する。
- `foundation-restricted`、`universal`、EDINET正本領域には、このreleaseの引き継ぎ作業で触れない。
- 追加投入は別release IDと別receiptを作り、今回のreleaseを再利用しない。

## まだ別途必要な監査

このhandoffはreleaseの保存完了を示すが、CloudflareのBucket Lock、Lifecycle、請求量、定期バックアップ、Foundation全体の復旧訓練、別プロバイダー復元まで完了したことを示さない。それらは別の承認・証跡・実測値で確認する。
