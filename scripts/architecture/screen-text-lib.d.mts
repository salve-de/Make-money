export const INTERNAL_TERMS: string[];
export const PROCESS_RES: Array<[RegExp, string]>;
export const SCREEN_ONLY_RES: Array<[RegExp, string]>;
export const STANDALONE_LINES: string[];
export const LIST_ONLY_RES: Array<[RegExp, string]>;
export function analyzeScreen(html: string, isAllowed: (text: string) => boolean): {
  unowned: string[];
  emptyHeadings: string[];
  dupFacts: string[];
  successIds: string[];
  chapterIds: string[];
  factCount: number;
  metricCount: number;
  sourceCount: number;
};
