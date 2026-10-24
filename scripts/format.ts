import { needsReview, type EyesResults } from './results.ts';

/** Hidden marker used to find our own comment on re-runs. */
export const COMMENT_MARKER = '<!-- applitools-eyes-results -->';

const ICON = { passed: '✅', new: '🆕', unresolved: '⚠️', failed: '❌' } as const;

export function formatComment(r: EyesResults, runUrl = ''): string {
  const verdict = needsReview(r) ? '⚠️ **Visual differences need review**' : '✅ **No unresolved visual differences**';
  const rows = r.tests.map((t) => `| ${ICON[t.status]} ${t.status} | ${t.url ? `[${t.name}](${t.url})` : t.name} |`);
  return [
    COMMENT_MARKER,
    '### Applitools Eyes',
    verdict,
    '',
    `| Passed | New | Unresolved | Failed |`,
    `|:-:|:-:|:-:|:-:|`,
    `| ${r.passed} | ${r.new} | ${r.unresolved} | ${r.failed} |`,
    '',
    '| Status | Test |',
    '|---|---|',
    ...rows,
    '',
    r.batchUrl ? `[Open the batch in Eyes](${r.batchUrl})` : '',
    `<sub>Commit \`${r.headSha.slice(0, 7)}\`${runUrl ? ` · [workflow run](${runUrl})` : ''}</sub>`,
  ].join('\n');
}

export const statusFor = (r: EyesResults) =>
  needsReview(r)
    ? { state: 'failure' as const, description: `${r.unresolved} unresolved, ${r.failed} failed - review in Eyes` }
    : { state: 'success' as const, description: `${r.passed} passed, ${r.new} new` };
