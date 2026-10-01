import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { SynthesisEntitiesSidebar } from '@/platform/components/synthesis/SynthesisEntitiesSidebar';
import { LootBlueprintSection } from '@/features/company-inspector/ui/LootBlueprintSection';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';

describe('detailed case content', () => {
 it('renders detailed content without expanding the card by default', () => {
  const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
  entity.essence = { whatItDoes: 'シーケンス図を生成', targetCustomer: '開発チーム', painRelief: '手動作図を削減' };
  entity.operations.toolStack = [{ name: 'SQLite', category: 'DB', monthlyCost: 0, isCostUnconfirmed: true }];
  const html = renderToStaticMarkup(<SynthesisEntitiesSidebar savedEntities={[entity!]} selectedEntityIds={new Set()} toggleSelectEntity={()=>{}} activeEditingEntityId={entity!.id} setActiveEditingEntityId={()=>{}} notes={{}} onSaveNote={()=>{}} formatMoney={String} handleSynthesize={()=>{}} isSynthesizing={false} />);
  expect(html).toContain('シーケンス図');
  expect(html).toContain('SQLite');
  expect(html).toContain('事業内容・料金・運営');
 });
 it('labels a case the user only viewed so it is never presented as saved', () => {
  const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
  const render = (bookmarkedIds: Set<string>) => renderToStaticMarkup(<SynthesisEntitiesSidebar savedEntities={[entity]} bookmarkedIds={bookmarkedIds} selectedEntityIds={new Set()} toggleSelectEntity={()=>{}} activeEditingEntityId={entity.id} setActiveEditingEntityId={()=>{}} notes={{}} onSaveNote={()=>{}} formatMoney={String} handleSynthesize={()=>{}} isSynthesizing={false} />);
  expect(render(new Set())).toContain('閲覧中の事例');
  expect(render(new Set([entity.id]))).not.toContain('閲覧中の事例');
 });
 it('shows an empty state instead of filling the list with cases the user never chose', () => {
  const html = renderToStaticMarkup(<SynthesisEntitiesSidebar savedEntities={[]} bookmarkedIds={new Set()} selectedEntityIds={new Set()} toggleSelectEntity={()=>{}} activeEditingEntityId="" setActiveEditingEntityId={()=>{}} notes={{}} onSaveNote={()=>{}} formatMoney={String} handleSynthesize={()=>{}} isSynthesizing={false} />);
  expect(html).toContain('保存した事例がここに並びます');
  expect(html).toContain('保存 0件中 0件を選択');
 });
 it('retains initial acquisition even with no tools or blueprint steps', () => {
  const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
  entity.lootBlueprint = undefined;
  entity.acquisition = undefined;
  entity.architecturePattern = '';
  entity.meta = undefined;
  entity.operations.toolStack = [];
  entity.strategy = { ...entity.strategy, initialTraction: ['創業時の具体的な獲得記録'] };
  const html = renderToStaticMarkup(<LootBlueprintSection entity={entity} isHazardMode={false} />);
  expect(html).toContain('創業時の具体的な獲得記録');
 });
});
