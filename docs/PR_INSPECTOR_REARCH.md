以下は、そのままGitHub PR本文へ貼れる完成稿です。現行UIが RelatedResearch → EvidenceDeck → Business → Financial → Tools → Playbook → EvidenceStream → Notes の縦積みであること、対してFoundation側はすでに「EvidenceがあるModuleだけ発火」「Entity != Case」「事実・推定・推論を分離」を契約として持つことを前提にしています。
PR: Money Circuit Case Dossier Architecture
PR Title
feat(case-dossier): replace vertical inspector with evidence-bound money circuit
Summary
個別銘柄画面を、従来の「企業情報をセクション順に読む縦型レポート」から完全に切り離す。
新しい個別銘柄画面は、企業紹介ページではない。

「誰の財布から、なぜ、どの経路を通って現金が移動し、どこで利益が捕獲され、何がその取り分を守り、どこが壊れると死に、その構造のどこを別市場へ転用できるか」を検証する Money Circuit Case Dossier とする。

画面構造は以下の4層を固定する。

L0 — CASE VERDICT
L1 — MONEY CIRCUIT / CONTROL POINT
L2 — VALIDATION / CASH AUTOPSY
L3 — TRANSFER ENGINE / PATTERN BASE RATE / YOUR MOVE
ただし、これは旧来の「0秒 → 3秒 → 30秒 → 5分」という記事の読み順ではない。
固定するのは認知座標と問いだけ。

各層内部のModuleは、Foundationに実在するEvidenceに応じて変化する。

さらにEvidenceを第5セクションとして最後に置くことを禁止する。

すべてのClaim / Metric / Circuit Node / Control Point / Transfer StepにEvidenceを直接横付けし、画面右側に常設Evidence Sidecarを置く。

1. 背景と動機
1.1 現行UIの問題
現行 CompanyInspectorPane は概ね以下のCompositionで構成されている。
CompanyHeader
  ↓
RelatedResearch
  ↓
EvidenceDeckSection
  ↓
BusinessSections
  ↓
FinancialSection
  ↓
ToolsSection
  ↓
PlaybookSections
  ↓
EvidenceStream
  ↓
AnalystNotes
内部ではさらにBusiness / Financial / Playbook等が複数セクションへ分割され、実質的に十数〜16セクション相当の縦型レポートになっている。
この構造には5つの根本問題がある。

Problem A — 「企業」単位に情報を整理している
北極星が知りたいのは、
この会社は何をしているか
ではない。
知りたいのは、

誰が、何に困り、なぜ財布を開き、どこを通って金が流れ、誰が最終的に取り分を取っているか
である。
にもかかわらず現在のUIでは、

会社概要
ビジネス
財務
ツール
戦略
Playbook
という企業百科事典的分類が画面構造を支配している。
これでは「資本主義の裏帳簿」ではなく、高密度な企業紹介ページに留まる。

Problem B — 因果関係をユーザーの頭の中で再構築させている
現行UIでは、
顧客の痛みはBusiness section
集客はAcquisition
価格はPricing
売上はFinancial
Stripe/API等はTools
競争優位はStrategy
再現方法はPlaybook
へ分断されている。
したがってユーザー自身が、

顧客の痛み
  ↓
集客
  ↓
購入
  ↓
価格
  ↓
決済
  ↓
原価
  ↓
利益
を頭の中で組み直さなければならない。
これはUIの責任放棄である。

新UIでは因果鎖そのものを第一級データとしてProjectionする。

Problem C — EvidenceがClaimから離れている
現在はEvidence DeckやEvidence Streamという独立領域が存在する。
その結果、

主張を読む
↓
後でEvidenceを見る
↓
どのEvidenceがどの主張を支えていたか探す
という構造になる。
金融・投資・事業判断画面では逆でなければならない。

主張
[FACT | Evidence 3]
をクリックした瞬間、その主張を支える一次資料・計算根拠・反証へ到達する必要がある。
Evidenceは「セクション」ではなく全画面を横断するprovenance layerとする。

Problem D — WinnerとFailureを同じ文章構造へ押し込んでいる
高収益企業とWeWork型の破綻事例では見るべき構造が異なる。
Winner:

Payer
→ Pain
→ Acquisition
→ Offer
→ Payment
→ Margin
→ Cash Capture
Failure:
Capital
→ Expansion
→ Fixed Obligation
→ Cash Burn
→ Weak Revenue
→ Refinancing Dependency
→ Breakpoint
従来UIではどちらも、
Business
Financials
Tools
Playbook
に押し込まれる。
新Projectionでは同じMoney Circuit文法を使いながら、cash capture / cash bleedの方向そのものを変える。

Problem E — 1社の逸話を「再現可能な法則」に見せてしまう
現在のPlaybookでは、1事例から転用案を作ることができる。
しかし、

KEYENCEが成功した
だから同じことをやればいい
では単なる成功者分析である。
必要なのは、

このMechanismを持つ事例は何件存在するか
成功したのは何件か
死んだのは何件か
成功条件は何か
死亡条件は何か
というCross-case Intelligence。
したがって個別Dossierへ PATTERN BASE RATE を導入する。

事例 → Mechanism → Pattern → Base Rate → Transfer

まで繋がって初めて「カンニングペーパー」になる。

2. 設計原則
本PRでは以下を不変条件とする。
2.1 Foundationが正本
FoundationBusinessCase
  ├ claims
  ├ metrics
  ├ moneySignals
  ├ events
  ├ relationships
  ├ observations
  ├ derived
  └ evidence
がCanonical Source。
UI専用Projectionは再生成可能でなければならない。

UI上で生成されたVerdict / Circuit / TransferをFoundationへ逆書き込みしない。

2.2 Entity != Case
同一企業から複数Caseを作れる。
例:

Costco
├ Membership fee engine
├ Inventory economics
└ Private-label leverage
会社名はContainerであり、Caseそのものではない。
Projectionの主キーは将来的に caseId とする。

2.3 Evidenceが存在しないModuleは出さない
禁止:
データが無い
→ AIがそれっぽい文章を補完
→ セクションを埋める
正:
データが無い
→ Moduleを発火しない
ただし重要な未知値については明示的に、
UNKNOWN
未確認
を表示できる。
2.4 Unknown != Zero
以下を禁止する。
売上不明 → ¥0
利益不明 → ¥0
CAC不明 → ¥0
ツール費不明 → ¥0
人員不明 → 0人
初期資本不明 → ¥0
Unknownは必ずUnknownとして保持する。
2.5 推論と事実を混ぜない
全表示Claimは以下のEpistemic Statusを持つ。
export type CaseEpistemicStatus =
  | 'FACT'
  | 'CALCULATED'
  | 'ESTIMATED'
  | 'INFERRED'
  | 'CONFLICTED'
  | 'UNKNOWN';
UIでは色だけに依存せずラベルを表示する。
FACT
CALC
EST
INFER
CONFLICT
UNKNOWN
3. 新アーキテクチャ
3.1 新しいPrimary Data Flow
現行Primary path:
FoundationBusinessCase
        ↓
adaptFoundationDetailToFinancialEntity()
        ↓
FinancialEntity
        ↓
CompanyInspectorPane
を廃止する。
新Primary path:

FoundationBusinessCase
        ↓
buildFoundationDossierProjection()
        ↓
CaseDossierProjection
        ↓
CaseDossierPane
FinancialEntity はPrimary read modelではなく、移行期間中のlegacy fallbackへ降格する。
4. 4層Case Dossier Shell
┌──────────────────────────────────────────────────────────────┐
│ L0 CASE VERDICT                                              │
├───────────────────────────────────────┬──────────────────────┤
│                                       │                      │
│ L1 MONEY CIRCUIT                      │ EVIDENCE SIDECAR     │
│    + CONTROL POINT                    │ always available     │
│                                       │                      │
├───────────────────────────────────────┤                      │
│ L2 VALIDATION                         │                      │
│    TRUTH COLLISION                    │                      │
│    CASH AUTOPSY                       │                      │
│    TIMELINE                           │                      │
├───────────────────────────────────────┤                      │
│ L3 TRANSFER ENGINE                    │                      │
│    PATTERN BASE RATE                  │                      │
│    OPERATING ARSENAL                  │                      │
│    YOUR MOVE                          │                      │
└───────────────────────────────────────┴──────────────────────┘
Evidence SidecarはLayerではない。
全Layerに直交する証拠レイヤーである。

5. L0 — CASE VERDICT
目的:
このCaseで金が生まれる、または消える理由を1画面目で断定する。

表示項目:

Entity
Case title
Mode
Money Verdict
Top 3 Proofs
Primary Singularity
Research freshness
Mode:
export type CaseMode =
  | 'WINNER'
  | 'HAZARD'
  | 'MIXED'
  | 'UNKNOWN';
Projection:
export interface EvidenceBound {
  evidenceIds: string[];
  epistemicStatus: CaseEpistemicStatus;
  asOf?: string;
}

export interface EvidenceBoundText extends EvidenceBound {
  id: string;
  text: string;
}

export interface CaseVerdictProjection {
  mode: CaseMode;

  sentence: EvidenceBoundText;

  strongestProofs: EvidenceBoundText[];

  singularity?: EvidenceBoundText;

  freshness?: {
    latestObservedAt?: string;
    stale: boolean;
  };
}
制約:
sentence は原則1文
strongestProofs は最大3件
INFERRED verdictには最低1つのFact/Calculated/Estimatedの根拠が必要
根拠0件で断定的Verdictを作らない
6. L1 — MONEY CIRCUIT
個別Dossierの主役。
企業ロゴではなく、現金移動の因果鎖を中心に置く。

基本文法:

PAYER
  ↓
TRIGGER / PAIN
  ↓
ACQUISITION
  ↓
OFFER
  ↓
PRICE
  ↓
PAYMENT RAIL
  ↓
REVENUE
  ↓
COST / LEAKAGE
  ↓
COMPANY
  ↓
OWNER / CAPITAL CAPTURE
すべてのCaseで全Nodeを強制しない。
6.1 Money Circuit Types
export type MoneyCircuitNodeKind =
  | 'PAYER'
  | 'TRIGGER'
  | 'ACQUISITION'
  | 'OFFER'
  | 'PRICE'
  | 'PAYMENT_RAIL'
  | 'REVENUE'
  | 'COST'
  | 'LEAKAGE'
  | 'CAPITAL_SOURCE'
  | 'COMPANY'
  | 'OWNER_CAPTURE'
  | 'BREAKPOINT';

export interface MoneyAmount {
  value: number;
  currency: string;
  period?: string;
}

export interface MoneyCircuitNode extends EvidenceBound {
  id: string;
  kind: MoneyCircuitNodeKind;

  label: string;

  value?: string;

  amount?: MoneyAmount;
}

export type MoneyCircuitRelation =
  | 'PAYS'
  | 'CONVERTS'
  | 'FLOWS_TO'
  | 'COSTS'
  | 'LEAKS_TO'
  | 'CAPTURES'
  | 'FUNDS'
  | 'DEPENDS_ON';

export interface MoneyCircuitEdge extends EvidenceBound {
  id: string;

  from: string;
  to: string;

  relation: MoneyCircuitRelation;

  label?: string;
}

export interface MoneyCircuitProjection {
  nodes: MoneyCircuitNode[];

  edges: MoneyCircuitEdge[];

  controlPointIds: string[];

  breakpointIds: string[];

  completeness:
    | 'COMPLETE'
    | 'PARTIAL';
}
6.2 Circuit integrity rules
すべてのEdgeは既存Nodeを参照すること。
禁止:

edge.from === missingNode
edge.to === missingNode
また以下を禁止する。
Revenueが分からない
→ 推論だけでRevenue nodeを作る
UNKNOWN重要値を示す場合:
{
  kind: 'REVENUE',
  label: 'Revenue',
  epistemicStatus: 'UNKNOWN',
  evidenceIds: []
}
とする。
amount.value = 0 を入れない。

7. CONTROL POINT
単なるMoatではなく、
この企業は何を握っているからValue Poolの取り分を持っていけるのか
を明示する。
export type ControlPointType =
  | 'CUSTOMER_ACCESS'
  | 'DISTRIBUTION'
  | 'PRICING'
  | 'LOCK_IN'
  | 'SUPPLY'
  | 'DATA'
  | 'REGULATORY'
  | 'BRAND'
  | 'NETWORK'
  | 'CAPITAL'
  | 'PROCESS'
  | 'OTHER';

export interface ControlPointProjection extends EvidenceBound {
  id: string;

  type: ControlPointType;

  title: string;

  whyItCapturesValue: string;

  killCondition?: string;

  linkedNodeIds: string[];
}
UI:
CONTROL POINT
Direct customer access

WHY IT CAPTURES VALUE
購買前に現場課題へ入り込み、比較条件そのものを設計できる

KILL CONDITION
標準化・EC化により営業接点が不要になる

[FACT · 4 sources]
Control PointはMoney Circuit Nodeへ視覚的に接続する。
8. BREAKPOINT
Control Pointの反対側。
ここが切れたら、このMoney Machineは壊れる
を示す。
Examples:

Platform API access
Customer acquisition channel
Renewal rate
Occupancy
Refinancing
Supplier exclusivity
Regulatory exemption
Founder audience
BreakpointはMoney Circuit上に直接描画する。
Failure CaseではControl PointよりBreakpointを強調してよい。

9. L2 — VALIDATION
L2は「追加情報」の場所ではない。
L1で示したMoney Circuitを潰しに行く領域である。

主要Module:

TRUTH COLLISION
CASH AUTOPSY
FIRST CASH
PRICING EVOLUTION
DISTRIBUTION ECONOMICS
CAPITAL CONTROL
FAILURE / PIVOT
TIMELINE
LIVE DELTA
COUNTER EVIDENCE
存在するEvidenceに応じて発火する。
10. TRUTH COLLISION
このPRで新設する重要Module。
目的:

会社の公式説明と、顧客・現場・行動・財務が語る現実を衝突させる。

export type TruthPerspective =
  | 'COMPANY'
  | 'CUSTOMER'
  | 'DISTRIBUTOR'
  | 'SUPPLIER'
  | 'EMPLOYEE'
  | 'BEHAVIORAL_DATA'
  | 'FINANCIAL_DATA'
  | 'REGULATOR'
  | 'ANALYST';

export interface TruthCollisionPerspective extends EvidenceBound {
  id: string;

  perspective: TruthPerspective;

  statement: string;
}

export interface TruthCollisionProjection {
  id: string;

  question: string;

  perspectives: TruthCollisionPerspective[];

  conclusion?: EvidenceBoundText;
}
発火条件:
最低2つの独立したPerspectiveが存在すること。

禁止:

COMPANY claim 1件
→ AIが架空Customer viewpointを生成
ANALYST conclusionはINFERREDとして明示する。
11. CASH AUTOPSY
旧Financial Sectionをそのまま移植しない。
数字はMoney Circuitを検証するために出す。

動的Module候補:

Revenue
Gross Profit
Operating Profit
Net Profit
Gross Margin
Operating Margin
First Cash
Pricing
Price Evolution
CAC
Distribution Economics
Money Leakage
Founder Cash
Capital Control
Headcount Leverage
Burn
Runway
Lease / Fixed Obligations
例えば売上しか確認できない企業なら、
Revenue
しか出さなくてよい。
空P&Lを作らない。

12. Timeline
企業の現在状態だけを見せない。
基本Phase:

GENESIS
  ↓
BREAKTHROUGH
  ↓
ENGINE
  ↓
NOW

or

GENESIS
  ↓
GROWTH
  ↓
BLEED
  ↓
BREAKPOINT
  ↓
DEATH / RESTRUCTURE
export interface CaseTimelinePoint extends EvidenceBound {
  id: string;

  occurredAt: string;

  phase:
    | 'GENESIS'
    | 'BREAKTHROUGH'
    | 'ENGINE'
    | 'GROWTH'
    | 'BLEED'
    | 'BREAKPOINT'
    | 'NOW'
    | 'DEATH'
    | 'OTHER';

  title: string;

  description: string;

  affectedNodeIds?: string[];
}
イベントが少なければScrubberを表示しない。
1〜2件なら単純Event Chip。

3件以上でTimeline Scrubberを発火可能とする。

13. L3 — TRANSFER ENGINE
旧Playbookを廃止する。
目的:

この会社の成功談を真似する
ではない。
どのFact Patternが他市場へ移植可能なのかを判定する
である。
13.1 Fact-bound Transfer
基本論理:
Observed Fact
    ↓
Mechanism
    ↓
Transfer Condition
    ↓
Minimal Test
export interface TransferStepProjection extends EvidenceBound {
  id: string;

  observedFact: string;

  mechanism: string;

  transferConditions: string[];

  minimalTest: string;
}
ルール:
2〜5 Step
exactly 3を強制しない
全StepにEvidence必須
INFERRED Mechanismは表示可
EvidenceなしのGeneric adviceは禁止
禁止例:
サブスクを導入する
SEOをやる
AIを活用する
SNSで発信する
顧客を大事にする
根拠となるCase-specific factがない限り表示しない。
14. DON'T COPY
成功Caseでも必須候補。
export interface DontCopyProjection extends EvidenceBound {
  id: string;

  warning: string;

  reason: string;
}
例:
DON'T COPY

「高単価」にだけ注目して価格を上げるな。

このCaseで価格決定力を成立させているのは、
価格ではなく failure-loss / direct access / switching friction。
15. PATTERN BASE RATE
個別成功事例を逸話で終わらせない。
export type PatternBaseRateStatus =
  | 'AVAILABLE'
  | 'INSUFFICIENT_SAMPLE'
  | 'UNAVAILABLE';

export interface PatternBaseRateProjection {
  status: PatternBaseRateStatus;

  patternId?: string;

  cohortDefinition?: string;

  sampleSize?: number;

  successCount?: number;

  failureCount?: number;

  unresolvedCount?: number;

  successConditions: EvidenceBoundText[];

  failureConditions: EvidenceBoundText[];

  caseIds: string[];
}
表示例:
PATTERN: FAILURE-COST PRICING

Cases     37
Winner    24
Failure    8
Unknown    5

SUCCESS CONDITIONS
・商品価格 << Failure Loss
・購買者本人が失敗責任を負う
・性能比較が難しい

FAILURE CONDITIONS
・購買部門へ完全標準化される
・安価な代替品で十分になる
重要:
Cross-case cohortが存在しない場合、比率を生成しない。

表示:

PATTERN BASE RATE
母集団不足
禁止:
成功率 0%
16. OPERATING ARSENAL
旧 ToolsSection を削除し、経済構造へ統合する。
Tools一覧を表示するのではない。

表示するのは、

このMoney Machineのどの部品を、誰に、いくらで代替させているか
である。
export type ArsenalCategory =
  | 'API'
  | 'SAAS'
  | 'AD_CHANNEL'
  | 'CONTRACTOR'
  | 'AFFILIATE'
  | 'MANUFACTURING'
  | 'LOGISTICS'
  | 'MARKETPLACE'
  | 'SALES'
  | 'DATA'
  | 'PAYMENT_RAIL'
  | 'AUDIENCE'
  | 'OTHER';

export interface ArsenalCost {
  value?: number;

  currency?: string;

  period?: string;

  status:
    | 'VERIFIED'
    | 'REPORTED'
    | 'ESTIMATED'
    | 'UNKNOWN';
}

export interface ArsenalItemProjection extends EvidenceBound {
  id: string;

  name: string;

  category: ArsenalCategory;

  economicRole: string;

  linkedNodeId?: string;

  cost?: ArsenalCost;

  replaces?: string;
}
例:
Stripe
PAYMENT RAIL

Role:
顧客のカード決済を処理

Economic effect:
自前決済基盤を不要化

Cost:
2.9% [REPORTED]

Linked:
PAYMENT → LEAKAGE
17. YOUR MOVE
画面の最終出力。
情報ではなく、次の検証行動へ落とす。

export interface YourMoveProjection extends EvidenceBound {
  hypothesis: string;

  minimalTest: string;

  budgetCap?: string;

  timebox?: string;

  successSignal: string;

  killSignal: string;

  prerequisites: string[];
}
Your Moveを出す条件:
transferable mechanism exists
AND
minimal test exists
AND
supporting evidence exists
満たさない場合は無理に生成しない。
18. Final Projection Contract
既存 dossier-projection.ts を捨てて別Projectionを作らない。
既存Projectionを昇格・拡張する。

export interface CaseDossierProjection {
  projectionVersion: 'money-circuit-v1';

  caseId: string;

  entity: {
    id: string;
    name: string;
    ticker?: string;
    url?: string;
  };

  caseLevel:
    | 'FULL_DOSSIER'
    | 'FOCUSED_CASE'
    | 'SIGNAL'
    | 'RELATED_ENTITY';

  verdict: CaseVerdictProjection;

  moneyCircuit: MoneyCircuitProjection;

  controlPoints: ControlPointProjection[];

  truthCollisions: TruthCollisionProjection[];

  cashAutopsyModules: DossierModule[];

  timeline: CaseTimelinePoint[];

  transferEngine?: {
    steps: TransferStepProjection[];

    dontCopy: DontCopyProjection[];

    patternBaseRate: PatternBaseRateProjection;

    arsenal: ArsenalItemProjection[];

    yourMove?: YourMoveProjection;
  };

  researchLimits: EvidenceBoundText[];

  allEvidenceIds: string[];
}
19. Evidence Architecture
19.1 Evidenceは独立セクションにしない
全Evidence-aware componentに共通callbackを渡す。
export interface EvidenceFocusContext {
  sourceKind:
    | 'VERDICT'
    | 'CIRCUIT_NODE'
    | 'CIRCUIT_EDGE'
    | 'CONTROL_POINT'
    | 'TRUTH_COLLISION'
    | 'CASH_MODULE'
    | 'TIMELINE'
    | 'TRANSFER'
    | 'BASE_RATE'
    | 'ARSENAL'
    | 'YOUR_MOVE';

  sourceId: string;
}

export type InspectEvidence = (
  evidenceIds: string[],
  context: EvidenceFocusContext
) => void;
19.2 Evidence Sidecar
Desktop:
main dossier: 75%
evidence sidecar: 25%
>= 1280px
sticky
always visible
selected claimのEvidenceを先頭表示
Tablet:
768–1279px

right drawer
width 360–420px
Mobile:
< 768px

bottom sheet
max-height 70vh
Props:
export interface EvidenceSidecarProps {
  caseId: string;

  selectedEvidenceIds: string[];

  allEvidenceIds: string[];

  focus?: EvidenceFocusContext;

  onCloseSelection: () => void;
}
19.3 Evidence loading
初回Detail fetch時に全原文を取得しない。
Primary projectionには以下だけ入れる。

evidenceId
status
source class
observedAt
summary metadata
原文・Locator・詳細はEvidence Sidecarを開いたときLazy loadする。
必要なら新規Route:

GET /api/businesses/evidence?ids=id1,id2,id3
制約:
max 50 IDs/request
duplicate IDs deduplicated
unknown IDs ignored / explicit missing metadata
Canonical Foundation Evidence Storeを読む。
新しいEvidence DBを作らない。

20. UI Component Tree
新規:
src/features/case-dossier/
├── CaseDossierPane.tsx
│
├── model/
│   ├── case-dossier-view.ts
│   ├── epistemic-display.ts
│   └── legacy-projection-adapter.ts
│
└── ui/
    ├── CaseVerdictBar.tsx
    │
    ├── MoneyCircuitWorkspace.tsx
    ├── MoneyCircuitBoard.tsx
    ├── MoneyCircuitNode.tsx
    ├── MoneyCircuitEdge.tsx
    ├── ControlPointDock.tsx
    │
    ├── ValidationWorkspace.tsx
    ├── TruthCollisionMatrix.tsx
    ├── CashAutopsyGrid.tsx
    ├── TimelineScrubber.tsx
    │
    ├── TransferWorkspace.tsx
    ├── TransferEnginePanel.tsx
    ├── PatternBaseRateCard.tsx
    ├── OperatingArsenal.tsx
    ├── YourMoveDock.tsx
    │
    ├── EvidenceBadge.tsx
    ├── EvidenceSidecar.tsx
    │
    └── ResearchLimits.tsx
既存Analyst Notesはロジックを再利用する。
主コンテンツの1セクションにはしない。

Utility drawer / toolbarへ移動する。

21. Root Props
export interface CaseDossierPaneProps {
  projection: CaseDossierProjection;

  currency: string;

  onClose: () => void;

  onPrevCase?: () => void;

  onNextCase?: () => void;

  analystNote?: string;

  noteSaveStatus?:
    | 'idle'
    | 'saving'
    | 'saved'
    | 'error';

  onSaveAnalystNote?: (
    caseId: string,
    note: string
  ) => void | Promise<void>;

  onOpenSynthesis?: (
    caseId: string
  ) => void;

  onApproveCase?: (
    caseId: string
  ) => void;

  isPro?: boolean;
}
22. Child Props
MoneyCircuitBoard
export interface MoneyCircuitBoardProps {
  circuit: MoneyCircuitProjection;

  controlPoints: ControlPointProjection[];

  onInspectEvidence: InspectEvidence;
}
TruthCollisionMatrix
export interface TruthCollisionMatrixProps {
  collisions: TruthCollisionProjection[];

  onInspectEvidence: InspectEvidence;
}
CashAutopsyGrid
export interface CashAutopsyGridProps {
  modules: DossierModule[];

  currency: string;

  onInspectEvidence: InspectEvidence;
}
TimelineScrubber
export interface TimelineScrubberProps {
  points: CaseTimelinePoint[];

  activePointId?: string;

  onPointChange?: (
    id: string
  ) => void;

  onInspectEvidence: InspectEvidence;
}
TransferEnginePanel
export interface TransferEnginePanelProps {
  steps: TransferStepProjection[];

  dontCopy: DontCopyProjection[];

  patternBaseRate: PatternBaseRateProjection;

  arsenal: ArsenalItemProjection[];

  yourMove?: YourMoveProjection;

  onInspectEvidence: InspectEvidence;
}
23. CaseDossierPane composition
実装は概ね以下に固定する。
export function CaseDossierPane({
  projection,
  currency,
  onClose,
  onPrevCase,
  onNextCase,
}: CaseDossierPaneProps) {
  const [evidenceSelection, setEvidenceSelection] =
    useState<EvidenceSelection | null>(null);

  const inspectEvidence: InspectEvidence = (
    evidenceIds,
    context
  ) => {
    setEvidenceSelection({
      evidenceIds,
      context,
    });
  };

  return (
    <aside data-testid="case-dossier">
      <CaseVerdictBar
        verdict={projection.verdict}
        entity={projection.entity}
        onInspectEvidence={inspectEvidence}
        onClose={onClose}
        onPrevCase={onPrevCase}
        onNextCase={onNextCase}
      />

      <div className="case-dossier-layout">
        <main>
          <MoneyCircuitWorkspace>
            <MoneyCircuitBoard
              circuit={projection.moneyCircuit}
              controlPoints={projection.controlPoints}
              onInspectEvidence={inspectEvidence}
            />
          </MoneyCircuitWorkspace>

          <ValidationWorkspace>
            <TruthCollisionMatrix
              collisions={projection.truthCollisions}
              onInspectEvidence={inspectEvidence}
            />

            <CashAutopsyGrid
              modules={projection.cashAutopsyModules}
              currency={currency}
              onInspectEvidence={inspectEvidence}
            />

            <TimelineScrubber
              points={projection.timeline}
              onInspectEvidence={inspectEvidence}
            />
          </ValidationWorkspace>

          {projection.transferEngine && (
            <TransferWorkspace>
              <TransferEnginePanel
                {...projection.transferEngine}
                onInspectEvidence={inspectEvidence}
              />
            </TransferWorkspace>
          )}

          <ResearchLimits
            items={projection.researchLimits}
          />
        </main>

        <EvidenceSidecar
          caseId={projection.caseId}
          selectedEvidenceIds={
            evidenceSelection?.evidenceIds ?? []
          }
          allEvidenceIds={projection.allEvidenceIds}
          focus={evidenceSelection?.context}
          onCloseSelection={() =>
            setEvidenceSelection(null)
          }
        />
      </div>
    </aside>
  );
}
24. Projection Rules
buildFoundationDossierProjection() で以下を行う。
claims
metrics
moneySignals
relationships
events
observations
derived
      ↓
evidence normalization
      ↓
case verdict
      ↓
money circuit
      ↓
control points
      ↓
truth collisions
      ↓
cash modules
      ↓
timeline
      ↓
transfer mechanisms
      ↓
cross-case pattern
重要:
React component内でBusiness logicを推論しない。

禁止:

if (grossMargin > 80) {
  // UI componentが勝手に高収益判定
}
正:
Projection Layer
→ meaning

UI Layer
→ rendering
25. Legacy Migration
移行期間だけ以下を許可する。
buildLegacyDossierProjection(
  entity: FinancialEntity
): CaseDossierProjection
配置:
src/features/case-dossier/model/
legacy-projection-adapter.ts
ルール:
view-only
Foundationへ書き戻さない
missing valuesを生成しない
legacy evidence statusを保持
unknown financialを0へ変換しない
generic LOOT_BLUEPRINTを新Transfer Stepへ自動昇格しない
Evidenceに紐づけられないlegacy playbookは破棄する
26. Fallback order
1. Rich Foundation Case
        ↓
2. FoundationDossierProjection
        ↓
3. render

Foundation caseが不十分
        ↓
4. curated legacy dossier存在確認
        ↓
5. legacy projection adapter
        ↓
6. render

どちらも薄い
        ↓
7. SIGNAL / RELATED_ENTITY viewer
特にPhoto AIで現在保証されている、
sparse Foundation candidateが、より情報量のあるcurated local dossierを破壊しない
という挙動を維持する。
27. File-by-file Change Plan
Modify
src/lib/foundation/dossier-projection.ts
追加:
Case Verdict
Money Circuit
Control Point
Breakpoint
Truth Collision
Transfer Step
Pattern Base Rate
Arsenal
Your Move
既存Module detectionロジックを再利用する。
src/platform/components/layout/TerminalShell.tsx
変更前:
Foundation Detail
→ FinancialEntity adapter
→ CompanyInspectorPane
変更後:
Foundation Detail
→ Dossier Projection
→ CaseDossierPane
e2e/company-inspector.spec.ts
新Dossier locatorへ変更。
ファイル名自体は初回PRでは残してよい。

次PRで case-dossier.spec.ts にrename可能。

Add
src/features/case-dossier/**
必要なら:
src/app/api/businesses/evidence/route.ts
Evidence lazy retrieval用。
Deprecate / Remove from primary path
src/features/company-inspector/CompanyInspectorPane.tsx
src/features/company-inspector/ui/BusinessSections.tsx
src/features/company-inspector/ui/EvidenceDeckSection.tsx
src/features/company-inspector/ui/FinancialSection.tsx
src/features/company-inspector/ui/ToolsSection.tsx
src/features/company-inspector/ui/PlaybookSections.tsx
このPR完了時点で少なくとも、
TerminalShell
からこれらへのPrimary importが存在してはならない。
完全にunusedになったものは同PRで削除する。

Legacy fallbackに必要なコードだけ明示的にlegacy/へ移す。

28. 表示シミュレーション — KEYENCE
これはUI target simulation。
実際の表示値はFoundation / curated evidenceに従う。

L0
KEYENCE

CASE VERDICT
工場の停止・品質不良リスクへ直接入り込み、
比較軸と価格決定権を握る直販型高収益機械。

PROOF
月商             ¥800.0億
営業利益         ¥432.0億
原価/直販構造    Evidenceあり

[INFER · Evidence 6]
既存テストで保証している数字は新UIでも失わない。
L1
工場 / 製造現場
      │
      ▼
ライン停止・品質不良への恐怖
      │
      ▼
直販営業
      │
      ▼
センサー / 計測 / 自動化
      │
      ▼
Premium Price
      │
      ▼
KEYENCE
  │        │
  ▼        ▼
COGS     SALES COST
  │
  └──────────► OPERATING PROFIT
CONTROL POINT:
CUSTOMER ACCESS / PRICING

現場へ直接入り込み、
製品比較より先に「解決すべき問題」を定義する。
L2
表示可能なEvidenceがある場合のみ:
PRICING
DISTRIBUTION ECONOMICS
GROSS MARGIN
OPERATING MARGIN
FIRST CASH
Truth Collisionの独立Perspectiveが足りない場合:
TRUTH COLLISION
自体を出さない。
L3
TRANSFER MECHANISM

Observed Fact
Failure lossが製品価格を大きく上回る

Mechanism
製造コストではなく、
顧客側のFailure Costを価格アンカーにできる

Transfer Conditions
・担当者自身がFailure責任を負う
・Failure Costが測定可能
・製品単価がFailure Costより十分小さい

Minimal Test
高損失業務10件を抽出し、
責任者5人へWTP interview
Pattern Base Rateが未生成なら:
PATTERN BASE RATE
母集団不足
29. 表示シミュレーション — Costco
数値はHardcodeしない。
EvidenceがFoundationに存在する項目のみ表示する。

L0
COSTCO

CASE VERDICT
商品そのものを最大利益源にせず、
低価格への信頼と来店習慣を作り、
MembershipをRecurring Cash Capture Pointにする。
L1
会員
 │
 ▼
低価格への期待 / 信頼
 │
 ▼
Warehouse visit
 │
 ├──► Merchandise payment
 │
 └──► Membership fee
             │
             ▼
       Recurring capture
CONTROL POINT候補:
MEMBERSHIP / RENEWAL
SKU CURATION
PURCHASING SCALE
Evidenceが存在するものだけ発火。
L2
Merchandise Economics
Membership Economics
Renewal
Inventory
Cash Conversion
Price Evolution
のうちEvidenceありだけ表示。
Truth Collision例:

QUESTION
薄利小売なのに、なぜ高品質な利益が残るのか？

MERCHANDISE
薄利

MEMBERSHIP
Recurring fee

ANALYST
利益源が商品単価だけではない
最後の結論はINFERRED。
L3
Transfer:
Observed Fact
Core transactionを低マージン化しても
別地点でRecurring feeを回収できる

Mechanism
Monetization point separation

Transfer Condition
・高頻度利用
・継続理由
・会員でいる便益
・本体低価格がacquisition engineとして機能

Minimal Test
本体粗利を落とし、
会員feeで回収する小規模cohortを比較
Pattern母集団が無ければBase Rateを生成しない。
30. 表示シミュレーション — Photo AI
このCaseでは「分からない数字を正直に出さない」こと自体が重要。
L0
PHOTO AI

CASE VERDICT
AI生成技術そのものではなく、
写真体験へ包装して個人の見栄・手間・羞恥回避へ課金する。

Revenue      未確認
Profit       未確認
絶対禁止:
Revenue ¥0
Profit  ¥0
L1
Evidenceが確認できた範囲のみ:
Individual
   │
   ▼
Appearance / convenience desire
   │
   ▼
Photo AI
   │
   ▼
Plan / subscription
   │
   ▼
Payment
   │
   ▼
Inference / API / Infra
   │
   ▼
Residual cash = UNKNOWN
L2
Revenueが未確認ならWaterfallを作らない。
代わりに:

KNOWN
・Price
・Product
・Confirmed stack
・Founder statements

UNKNOWN
・Revenue
・Operating profit
・Net cash retained
を表示。
L3
「AI wrapperだから儲かる」は禁止。
Evidenceから、

Observed Fact
Mechanism
Transfer Condition
Minimal Test
が組める場合のみTransfer Engineを表示する。
31. 表示シミュレーション — WeWork / Post-Mortem
Winner UIへ無理に押し込まない。
mode = HAZARD

L0
WEWORK

CASE VERDICT
短期・柔軟な顧客売上に対し、
長期固定契約と拡張コストを積み上げ、
外部資本への依存が切れた瞬間にCash Machineが逆回転した。
Epistemic statusは実際のEvidenceに従う。
L1
WinnerとはMoney Circuitの流れ自体が異なる。
INVESTOR CAPITAL
       │
       ▼
    WEWORK
       │
       ├────► Long-term leases
       │
       ├────► Buildout
       │
       ├────► Expansion
       │
       │
       ◄──── Short-term membership revenue
       │
       ▼
   CASH DEFICIT
       │
       ▼
REFINANCING DEPENDENCY
       │
       X
   BREAKPOINT
Control PointよりBreakpointを強調する。
BREAKPOINT

Occupancy
Lease rigidity
Financing access
L2
Capital Raised
Cash Burn
Lease Obligations
Occupancy
Revenue
Loss
Layoffs
Restructuring
Evidenceありだけ表示。
Truth CollisionのEvidenceがある場合:

GROWTH NARRATIVE
vs
CASH / LEASE REALITY
を表示。
L3
Winnerのように「これを真似しろ」を出さない。
中心は:

DON'T COPY
とする。
Transferable mechanismがある場合も、

Duration mismatch
Fixed obligation
Capital dependence
等の死亡条件検出器として利用する。
32. Existing Regression Guarantees
新UI化によって既存の証拠品質を破壊してはならない。
最低限以下を維持する。

KEYENCE
¥800.0億
¥432.0億
がfixture上確認済みであれば新Cash AutopsyまたはProofへ表示される。
Photo AI
未確認
を維持。
Fake zero禁止。

Fake waterfall禁止。

Sparse Foundation candidateがcurated dossierを潰さない。

Jasper.ai
既存Post-Mortem data:
¥-260,000,000
が存在する場合、新Cash Autopsyでも消失させない。
Hazard Caseとして表示。

33. E2E test IDs
以下を固定する。
case-dossier
case-verdict
money-circuit
money-circuit-node
control-point
truth-collision
cash-autopsy
case-timeline
transfer-engine
pattern-base-rate
operating-arsenal
your-move
evidence-badge
evidence-sidecar
research-limit
動的Nodeには:
data-testid="money-circuit-node"
data-node-kind="PAYER"
data-node-id="..."
を付与する。
34. Unit Test Requirements
Projection

同じFoundationBusinessCaseから毎回同じProjectionが生成される

Projection順序がdeterministic

MoneyCircuit edgeがmissing nodeを参照しない

Evidence IDがdeduplicateされる

EvidenceなしModuleが発火しない

Unknown financialが0へ変換されない

Fact / Calculated / Estimated / Inferredが保持される

conflicted evidenceを単一Factに潰さない

generic Transfer Stepを生成しない

Transfer Stepは2〜5個

Transfer StepごとにEvidenceが存在する

Pattern Base Rate unavailable時に成功率を計算しない

Failure CaseでCapital Source / Leakage / Breakpointを表現可能

Projection結果がUI componentに依存しない
35. UI Acceptance Criteria
Architecture

Primary Foundation detail pathがFinancialEntityを経由しない

TerminalShellがCaseDossierPaneをPrimary rendererとして使用する

旧CompanyInspectorの縦型CompositionがPrimary pathから消えている

#01 → #12のような固定セクション番号をMain dossierで使用しない

4 Shellのsemantic positionは全Caseで固定

Shell内部ModuleはCaseごとに可変
Money Circuit

PayerからCash Capture / Cash BleedまでをNode/Edgeで表現できる

Missing nodeを架空生成しない

Control PointがCircuit nodeへ紐づく

BreakpointがCircuit nodeへ紐づく

Winner / Failure双方を同じData Contractで表示できる
Evidence

VerdictをクリックするとEvidence Sidecarが開く

Circuit Nodeをクリックすると該当Evidenceだけが開く

Metricをクリックすると該当Evidenceだけが開く

Control Pointをクリックすると該当Evidenceだけが開く

Transfer StepをクリックするとObserved FactのEvidenceへ到達できる

Evidence statusを色だけで区別しない

Evidence raw bodyはLazy load

Main payloadに全Evidence原文を載せない

Evidence専用巨大セクションをPrimary flowへ残さない
Financial integrity

Unknown revenue != 0

Unknown profit != 0

Unknown CAC != 0

Unknown cost != 0

Unknown headcount != 0

Unknown capital != 0

estimated valueにはEST表示

calculated valueにはCALC表示

inferred conclusionにはINFER表示
Transfer

EvidenceなしのPlaybookを表示しない

「SEOしろ」「SNSをやれ」等のGeneric Adviceを生成しない

Observed Fact → Mechanism → Condition → Testが追跡可能

DON'T COPYをCaseごとに表示可能

Failure Caseは無理にpositive actionへ変換しない
Pattern Base Rate

Cross-case dataが存在する場合のみ率を表示

sample sizeを必ず表示

cohort definitionを表示可能

unresolved casesを成功/失敗へ勝手に分類しない

母集団不足時は「母集団不足」

unavailableを0%として表示しない
Arsenal

Tools logo一覧を表示しない

Arsenal itemにはeconomicRoleが必要

Circuit nodeへ紐づけ可能

unknown costを0円表示しない

API以外の外注・人員・物流・Sales・Affiliateも扱える
36. Responsive Acceptance
Desktop >= 1280px

Verdict sticky

Main workspace + Evidence Sidecarを同時表示

Evidence Sidecarはsticky

Circuit全体が横方向に追跡可能
Tablet 768–1279px

Evidenceはright drawer

Main circuitの操作状態を維持
Mobile < 768px

Evidenceはbottom sheet

bottom sheet最大約70vh

Circuitはhorizontal scrollまたはcompact lane表示

Node → Evidence遷移が1tap
37. Navigation Regression
既存操作を壊さない。

EscapeでDossier close

Previous case

Next case

keyboard navigation

selected entity変更時にstate reset

Evidence Sidecar selectionもentity変更時reset

URL direct section / focusが必要なら新Shell IDへmapping
新Anchor:
verdict
circuit
validation
transfer
旧:
business
financials
tools
playbook
はmigration mappingを入れてもよい。
38. Performance Requirements

一覧画面でCase detailをN+1 fetchしない

Evidence raw bodyを初期ロードしない

Projection計算が純粋関数として実行可能

Same input → same output

serving projectionを将来precompute可能な形にする

UI専用stateをFoundationへ保存しない

新たなSecond Truth Storeを作らない
39. Explicit Non-Goals
このPRでは以下をやらない。
Foundation schemaそのものをUI都合で狭める
新しい会社DBを作る
AIで欠損データを埋める
全Caseへ同じModuleを強制する
架空Base Rateを生成する
架空Founder Cashを生成する
既存R2 canonical dataを書き換える
40. Completion Definition
本PRは「新しい見た目を追加した」だけでは完了ではない。
以下の状態になって初めてDone。

FoundationBusinessCase
        ↓
Evidence-bound Projection
        ↓
Money Circuit
        ↓
Control Point / Breakpoint
        ↓
Validation
        ↓
Cross-case Pattern
        ↓
Transfer
        ↓
Your Move
が一本のData Lineageとして追跡可能であること。
そしてユーザーがKEYENCE、Costco、Photo AI、WeWorkのいずれを開いても、

「会社について何を知っているか」ではなく、

誰が払っているか
なぜ払っているか
どの経路で金が流れるか
どこで利益が捕獲されるか
誰・何がその取り分を守っているか
どこが切れると死ぬか
その判断を何のEvidenceが支えるか
同じMechanismは他事例でも成立したか
何を転用できるか
今、自分は何を最小実験すべきか
を一続きで判断できなければならない。
Final Architecture Rule
SHELL      = FIXED
QUESTION   = FIXED

MODULE     = EVIDENCE-DRIVEN
ANSWER     = CASE-SPECIFIC

CLAIM      = EVIDENCE-BOUND
UNKNOWN    ≠ ZERO

CIRCUIT    = CAUSAL
CONTROL    = VALUE CAPTURE
BREAKPOINT = FAILURE CONDITION

TRANSFER   = FACT-BOUND
BASE RATE  = CROSS-CASE

EVIDENCE   = ALWAYS BESIDE THE CLAIM
会社紹介ページを作らない。
資本主義の現金回路を描く。

それがこのPRの唯一の目的である。
この仕様なら、実装担当は dossier-projection.ts → CaseDossierProjection → CaseDossierPane → Evidence Sidecar の順でそのまま着手できます。