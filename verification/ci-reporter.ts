import { readFileSync } from 'node:fs';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/** Emit diagnostics immediately; a later timeout must not hide the first failing assertion. */
export default class ImmediateFailureReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed' || result.status === 'skipped') return;
    console.log(`\nFAILED_TEST: ${test.titlePath().join(' > ')}`);
    for (const error of result.errors) console.log(error.message || error.stack || 'Unknown failure');
    for (const attachment of result.attachments) {
      if (attachment.path?.endsWith('.md')) {
        console.log(`FAILURE_CONTEXT: ${readFileSync(attachment.path, 'utf8').slice(0, 14000)}`);
      }
    }
  }
}
