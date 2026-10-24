import { readResults, needsReview } from './results.ts';

const r = readResults();
if (needsReview(r)) {
  console.error(`${r.unresolved} unresolved and ${r.failed} failed visual test(s). Review: ${r.batchUrl}`);
  process.exit(1);
}
console.log('No unresolved visual differences.');
