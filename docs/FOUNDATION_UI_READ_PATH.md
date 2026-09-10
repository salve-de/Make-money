# Foundation R2 → Make-Money UI 読み取り経路

## 目的

既存の `foundation-lake` にある登録済みデータを、Make-Money の既存台帳UIへ高速・低コストで表示する。Foundation の正本を変更せず、Make-Money 側で必要な表示形へ読み取り時だけ整形する。

## 採用方式

1. **一覧** — `ds.business.entities.core` の登録済み `entities/` prefix を R2 List の cursor でページングする。1ページ100件、画面側も100件単位で段階描画する。
2. **詳細** — 選択された `entity_id` の entity object を読み、`ds.business.research-bundles.derived` を短い byte range で先に探索する。対象entityの可能性があるbundleだけ本体を読み、claims / metrics / money-signals / events / relationships / observations / derived を重複排除して表示する。
3. **キャッシュ** — 同じWorker isolate内の短期メモリキャッシュ、ブラウザの短期 `Cache-Control`、bundle一覧・bundle候補のキャッシュを使う。R2へUI用indexを書き戻さない。
4. **不明値** — 記録されていない売上・利益・人数・創業年などは `未確認` のままにする。報告値・観測値・推定値・推論値を混ぜず、詳細のorigin/status/evidenceを表示する。

## 料金の考え方

一覧1ページはR2のList 1回とEntity object最大100件のread、詳細はbundle候補のrange readと該当bundleのreadだけを使う。同一Worker/browserの短期キャッシュで再読を抑える。R2 Standardの無料枠・単価・転送料の最新条件は [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/) を基準にし、無料を永久保証とは扱わない。

## 採用しなかった方式

- **毎回全bundleを本体取得**: 初回も詳細も遅く、R2 read回数が増えるため不採用。
- **R2 root `index.json`の上書き**: 正本の物理配置と競合し、create-only/readback契約にも反するため不採用。
- **Make-Money独自の新schemaをR2へ保存**: Foundationの正本・registry・既存dataset契約を二重化するため不採用。
- **外部DB/KVへの全量同期**: 10万件規模で一覧検索・集計が必要になった時の候補だが、現時点では同期経路と新しい正本が増えるため不採用。
- **R2 SQL/Data CatalogをUIの都度クエリ**: 大規模分析には候補だが、現在のJSON datasetを表示するだけの経路には運用・クエリコストが過剰。必要になった場合もFoundationの登録済みview/derived契約を先に確認する。

## 増加時の段階的な拡張

- 〜数千件: 現行のcursor一覧 + 選択時詳細 + 短期キャッシュ（今回のPreview実測は2,027 entities / 507 bundles）。
- 数千〜10万件: Foundationで許可された versioned serving view を、別途明示承認のうえ create-only で再構築し、UIはその既存viewを読む。root `LATEST` pointerや上書きは作らない。
- 高度な検索・集計: 登録済みdataset/viewを基に、検索用サービスまたは分析経路を追加する。UIの表示値を新たな事実正本にしない。

## 保護境界

- `universal`、EDINET、Investraderの既存データは読まない・変更しない。
- この読み取り経路はR2のPUT/DELETEを呼ばない。
- 既存collectionのローカルファイルやR2 bundleを再生成・上書きしない。
- 現在のR2のentity数・bundle数が「調査事例数」と一致するとは仮定しない。UIは実際に存在する登録済みobjectを表示し、欠落は欠落として扱う。
