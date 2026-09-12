/**
 * Universal Observation Envelope (uf.observation.v1)
 *
 * プロジェクト非依存で世界中のあらゆる客観事実・観測データを無損失で受入・保全するための万能受入型。
 * 特定ドメインの固定スキーマに依存せず、生の観測テキスト・JSON・メタデータを安全に保持する。
 */

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ObservationOriginType =
  | "reported"
  | "observed"
  | "estimated"
  | "inferred"
  | "unknown";

export type ObservationVerificationState =
  | "SUPPORTED"
  | "UNVERIFIED"
  | "CONFLICTED"
  | "SUPERSEDED"
  | "RETRACTED";

export type ObservationRights =
  | "allowed_private_raw"
  | "restricted_private_raw"
  | "metadata_only"
  | "blocked"
  | "pending_review";

export interface ObservationSubject {
  entityId: string;
  role: "primary" | "related";
}

export interface ObservationEnvelope {
  schema: "uf.observation.v1";

  /** 一意の観測レコードID (obs_<hash>) */
  observationId: string;

  /** 収集実行セッションID */
  runId: string;

  /** 収集を行ったエージェント/ツールの情報 */
  producer: {
    id: string;
    version: string;
  };

  /** 観測対象エンティティ */
  subjects: ObservationSubject[];

  /**
   * 観測種別（ドメイン拡張可能）
   * 例: "business.metrics.revenue", "media.podcast.transcript", "community.forum.comment", "corporate.event.pivot"
   */
  observationType: string;

  /** 現実世界で観測された日時 */
  observedAt?: string;

  /** レコードが作成・記録された日時 */
  recordedAt: string;

  /** 有効期間（該当する場合） */
  validTime?: {
    point?: string;
    from?: string;
    to?: string;
  };

  /** 情報源の性質 */
  originType: ObservationOriginType;

  /** 検証ステータス */
  verificationState: ObservationVerificationState;

  /** 出典URL/識別子の参照 */
  sourceRefs: string[];

  /** 証拠Blob/生魚拓の参照 (evi_<hash>) */
  evidenceRefs: string[];

  /** 局所矛盾調停（Truth Resolution）用セマンティックキー */
  semantic?: {
    key?: string;
    attribute?: string;
    scope?: string;
    unit?: string;
  };

  /** 生テキスト（文字起こし、引用文、生HTML抜粋等） */
  text?: string;

  /** 構造化ペイロード（任意の生JSON） */
  payload: JsonValue;

  /** ペイロードのSHA-256ハッシュ（改ざん防止・完全一致重複排除） */
  contentSha256: string;

  /** 著作権・開示制限ステータス */
  rights: ObservationRights;
}

/**
 * 収集バッチ (uf.intake-batch.v1)
 * 1事実1オブジェクトを廃止し、1回の収集実行単位でまとめてR2に保存するためのエンベロープ
 */
export interface IntakeBatch {
  schema: "uf.intake-batch.v1";
  batchId: string;
  producerId: string;
  submittedAt: string;
  observations: ObservationEnvelope[];
}
