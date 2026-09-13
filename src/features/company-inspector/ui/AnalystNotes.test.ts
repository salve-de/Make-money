import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AnalystNotes } from './AnalystNotes';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
it.each([
  ['loading', '読み込み中'], ['saved', 'アカウントに保存済み'], ['local', 'このブラウザだけに保存'], ['saving', '保存中'], ['error', '未保存・再入力で再試行'],
] as const)('notes badge reflects %s instead of assuming every draft is saved', (status, label) => {
  const html = renderToStaticMarkup(createElement(AnalystNotes, { entity: INSTITUTIONAL_ENTITIES[0], analystNote: 'draft', noteSaveStatus: status, isHazardMode: false }));
  expect(html).toContain(label);
  expect(html).not.toContain('自動保存済');
  if (status !== 'saved') expect(html).not.toContain('アカウントに保存済み');
});
