import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TERMINAL_COMPANIES } from '@/data/terminalData';
import { ExecutiveDetailSheet } from './ExecutiveDetailSheet';

describe('Finder financial period display', () => {
  it('retains the launch revenue and period instead of fabricating actual monthly revenue', () => {
    const company = TERMINAL_COMPANIES.find((entry) => entry.id === 'outbid-lol')!;
    const html = renderToStaticMarkup(createElement(ExecutiveDetailSheet, { company }));
    expect(html).toContain('記録売上（ローンチ初週）');
    expect(html).toContain('¥2,000万円');
    expect(html).not.toContain('直近月商実額');
    expect(html).not.toContain('¥167万円');
  });
});
