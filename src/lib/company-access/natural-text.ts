import type { FinancialEntity, LootBlueprint, OpportunityJudgment } from '@/shared/terminal';
import templatePhrases from './template-phrases.json';
import {
  TEMPLATE_SENTENCE_MIN,
  clausesOf,
  dropNameStuffing,
  entityNames,
  isPhraseClause,
  isProtectedSentence,
  isSameContent,
  repairTruncation,
  restoreDroppedSubject,
  sentencesOf,
  stripMoneyHeadline,
  templateKey,
  tidyText,
} from './natural-text-core';

/**
 * 公開前に文章を自然にする（サーバー専用。定型文リストを使う）。
 * - 多数の事例に同じ形で出る定型文（旧生成パイプラインの言い回し）を外す
 * - 途中で切れた文・名前の連呼・句読点や空白の崩れを直す
 * - 同じ内容を別の欄で繰り返さない
 * - 再監査が「AI生成・未検証」と印を付けた事例では、分析文そのものを出さない
 * 事実・出典・調査限界（証拠カード、観測、未確認の注記）には手を入れない。
 */

const TEMPLATE_SENTENCES: ReadonlySet<string> = new Set(templatePhrases.sentences);
const TEMPLATE_CLAUSES: ReadonlySet<string> = new Set(templatePhrases.clauses);

interface TextContext {
  names: readonly string[];
  subject?: string;
}

/** 再監査が「旧生成パイプラインのAI分析文で、事業内容と照合していない」と記録した事例か。 */
export function hasUnverifiedAiNarrative(entity: Pick<FinancialEntity, 'reaudit'>): boolean {
  const status = entity.reaudit?.narrativeStatus;
  return typeof status === 'string' && status.startsWith('AI_GENERATED_UNVERIFIED');
}

/** 多数の事例に同じ形で出る定型文か（調査状態の説明と日付付きの記述は対象外）。 */
export function isTemplateSentence(sentence: string, names: readonly string[]): boolean {
  if (isProtectedSentence(sentence)) return false;
  const key = templateKey(sentence, names);
  if (key.length >= TEMPLATE_SENTENCE_MIN && TEMPLATE_SENTENCES.has(key)) return true;
  return clausesOf(key).some((clause) => isPhraseClause(clause) && TEMPLATE_CLAUSES.has(clause));
}

function withoutTemplates(text: string, names: readonly string[]): string {
  return text.split('\n')
    .map((line) => sentencesOf(line).filter((sentence) => !isTemplateSentence(sentence, names)).join(''))
    .filter(Boolean)
    .join('\n');
}

/** 説明文の欄。 */
function prose(value: unknown, context: TextContext, options: { describesBusiness?: boolean } = {}): string {
  if (typeof value !== 'string') return '';
  let text = stripMoneyHeadline(dropNameStuffing(tidyText(value), context.names));
  if (options.describesBusiness) text = restoreDroppedSubject(text, context.subject);
  return repairTruncation(tidyText(withoutTemplates(text, context.names)));
}

/** 短い見出し・区分の欄（文の途中切れは直さず、値ごと定型かだけを見る）。 */
function label(value: unknown, context: TextContext): string {
  if (typeof value !== 'string') return '';
  const text = dropNameStuffing(tidyText(value), context.names);
  return text && isTemplateSentence(text, context.names) ? '' : text;
}

/** 箇条書きの欄。項目の3分の2以上が定型なら、残りも同じ型の穴埋めなので一覧ごと出さない。 */
function proseList(items: unknown, context: TextContext): string[] {
  if (!Array.isArray(items)) return [];
  const values = items.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  const kept: string[] = [];
  let dropped = 0;
  for (const item of values) {
    const text = prose(item, context);
    if (!text) dropped += 1;
    else if (!kept.some((existing) => isSameContent(existing, text))) kept.push(text);
  }
  return values.length >= 2 && dropped * 3 >= values.length * 2 ? [] : kept;
}

function displaySubject(name: unknown): string | undefined {
  if (typeof name !== 'string') return undefined;
  const subject = name.replace(/\s*[（(][^（）()]*[)）]\s*$/, '').trim();
  return subject || undefined;
}

// 旧データのトップレベルに残る説明の欄（型には無いが公開レスポンスに含まれる）
const LEGACY_PROSE_KEYS = ['blindspot', 'moatDescription', 'secretInsight', 'incumbentDilemma', 'description'] as const;

type Mutable = FinancialEntity & Record<string, unknown>;

function naturalizeLoot(loot: LootBlueprint, context: TextContext): LootBlueprint {
  return {
    ...loot,
    targetPrey: prose(loot.targetPrey, context),
    structuralFlaw: prose(loot.structuralFlaw, context),
    stealthEntry: prose(loot.stealthEntry, context),
    tollGateSetup: label(loot.tollGateSetup, context),
    executionChecklist: proseList(loot.executionChecklist, context),
  };
}

function naturalizeJudgment(judgment: OpportunityJudgment, context: TextContext): OpportunityJudgment {
  return {
    ...judgment,
    verdictLabel: tidyText(judgment.verdictLabel ?? ''),
    oneLineReason: prose(judgment.oneLineReason, context),
    demandDelta: label(judgment.demandDelta, context),
    competitionDelta: label(judgment.competitionDelta, context),
  };
}

/** AI生成・未検証と印の付いた分析文を外す（事実の欄は残す）。 */
function dropUnverifiedNarrative(next: Mutable): void {
  next.targetPainWallet = '';
  next.architecturePattern = '';
  next.pipelineStack = '';
  next.strategy = {
    ...next.strategy,
    blindspot: '',
    moatType: 'UNKNOWN',
    moatDescription: '',
    incumbentDilemma: '',
    secretInsight: '',
    initialTraction: [],
    actionPlaybook: [],
    coldOutreachTemplate: '',
  };
  for (const key of ['lootBlueprint', 'opportunityJudgment', 'pricing', 'acquisition', 'meta', 'exposureAudit', 'dynamicMoats', ...LEGACY_PROSE_KEYS]) {
    delete next[key];
  }
  next.hasPremiumAnalysis = false;
}

/** 同じ内容を別の欄で繰り返さない（優先順の早い欄を残す）。 */
function dropRepeatedFields(next: Mutable): void {
  const kept = [next.tagline, next.essence?.whatItDoes].filter((text): text is string => Boolean(text));
  const slots: Array<[() => string | undefined, (value: string) => void]> = [
    [() => next.essence?.painRelief, (value) => { if (next.essence) next.essence = { ...next.essence, painRelief: value }; }],
    [() => next.essence?.targetCustomer, (value) => { if (next.essence) next.essence = { ...next.essence, targetCustomer: value }; }],
    [() => next.targetPainWallet, (value) => { next.targetPainWallet = value; }],
    [() => next.strategy?.secretInsight, (value) => { next.strategy = { ...next.strategy, secretInsight: value }; }],
    [() => next.strategy?.blindspot, (value) => { next.strategy = { ...next.strategy, blindspot: value }; }],
    [() => next.strategy?.incumbentDilemma, (value) => { next.strategy = { ...next.strategy, incumbentDilemma: value }; }],
    [() => next.strategy?.moatDescription, (value) => { next.strategy = { ...next.strategy, moatDescription: value }; }],
    [() => next.lootBlueprint?.targetPrey, (value) => { if (next.lootBlueprint) next.lootBlueprint = { ...next.lootBlueprint, targetPrey: value }; }],
    [() => next.lootBlueprint?.structuralFlaw, (value) => { if (next.lootBlueprint) next.lootBlueprint = { ...next.lootBlueprint, structuralFlaw: value }; }],
    [() => next.lootBlueprint?.stealthEntry, (value) => { if (next.lootBlueprint) next.lootBlueprint = { ...next.lootBlueprint, stealthEntry: value }; }],
    [() => next.opportunityJudgment?.oneLineReason, (value) => { if (next.opportunityJudgment) next.opportunityJudgment = { ...next.opportunityJudgment, oneLineReason: value }; }],
  ];
  for (const [read, write] of slots) {
    const value = read();
    if (!value) continue;
    if (kept.some((existing) => isSameContent(existing, value))) write('');
    else kept.push(value);
  }
}

// 同じ事例オブジェクト（カタログのキャッシュ）を何度も整えないための記録
const naturalized = new WeakMap<object, FinancialEntity>();

/**
 * 公開用に文章を整えたコピーを返す。元の値は変えない。何度かけても同じ結果になる。
 */
export function naturalizeEntity<T extends FinancialEntity>(entity: T): T {
  const cached = naturalized.get(entity);
  if (cached) return cached as T;
  const result = naturalizeUncached(entity);
  naturalized.set(entity, result);
  naturalized.set(result, result);
  return result;
}

function naturalizeUncached<T extends FinancialEntity>(entity: T): T {
  const context: TextContext = {
    names: entityNames(entity),
    subject: displaySubject(entity.name),
  };
  const next = { ...entity } as T & Mutable;

  next.tagline = prose(entity.tagline, context, { describesBusiness: true });
  if (entity.essence) {
    next.essence = {
      whatItDoes: prose(entity.essence.whatItDoes, context, { describesBusiness: true }),
      targetCustomer: prose(entity.essence.targetCustomer, context),
      painRelief: prose(entity.essence.painRelief, context),
    };
  }
  if (entity.temporal) {
    next.temporal = {
      ...entity.temporal,
      initialTractionPeriod: label(entity.temporal.initialTractionPeriod, context),
      viabilityLabel: label(entity.temporal.viabilityLabel, context),
      eraContext: prose(entity.temporal.eraContext, context),
      currentViabilityAnalysis: prose(entity.temporal.currentViabilityAnalysis, context),
    };
  }

  if (hasUnverifiedAiNarrative(entity)) {
    dropUnverifiedNarrative(next);
  } else {
    next.targetPainWallet = prose(entity.targetPainWallet, context);
    next.architecturePattern = label(entity.architecturePattern, context);
    next.pipelineStack = label(entity.pipelineStack, context);
    if (entity.strategy) {
      next.strategy = {
        ...entity.strategy,
        blindspot: prose(entity.strategy.blindspot, context),
        moatDescription: prose(entity.strategy.moatDescription, context),
        incumbentDilemma: prose(entity.strategy.incumbentDilemma, context),
        secretInsight: prose(entity.strategy.secretInsight, context),
        initialTraction: proseList(entity.strategy.initialTraction, context),
        actionPlaybook: proseList(entity.strategy.actionPlaybook, context),
        coldOutreachTemplate: prose(entity.strategy.coldOutreachTemplate, context),
      };
    }
    if (entity.lootBlueprint) next.lootBlueprint = naturalizeLoot(entity.lootBlueprint, context);
    if (entity.opportunityJudgment) next.opportunityJudgment = naturalizeJudgment(entity.opportunityJudgment, context);
    if (entity.pricing) {
      next.pricing = {
        ...entity.pricing,
        model: label(entity.pricing.model, context),
        pricePoint: label(entity.pricing.pricePoint, context),
        psychologicalTrigger: prose(entity.pricing.psychologicalTrigger, context),
      };
    }
    if (entity.acquisition) {
      next.acquisition = {
        ...entity.acquisition,
        primaryFunnel: prose(entity.acquisition.primaryFunnel, context),
        tactics: proseList(entity.acquisition.tactics, context),
      };
    }
    const legacy = entity as Mutable;
    for (const key of LEGACY_PROSE_KEYS) {
      if (typeof legacy[key] === 'string') (next as Mutable)[key] = prose(legacy[key], context);
    }
  }

  dropRepeatedFields(next);
  // 理由のない判定は、固定の区分だけが並ぶので出さない
  if (next.opportunityJudgment && !next.opportunityJudgment.oneLineReason) delete next.opportunityJudgment;
  if (Array.isArray(entity.observations)) next.observations = entity.observations.map((item) => tidyText(item)).filter(Boolean);
  return next;
}
