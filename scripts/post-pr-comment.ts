import { loadCiContext } from './ci-context.ts';
import { readResults } from './results.ts';
import { COMMENT_MARKER, formatComment } from './format.ts';
import { upsertComment } from './github.ts';

const ci = loadCiContext();
if (!ci.prNumber) {
  console.log('Not a pull request run; skipping comment.');
  process.exit(0);
}
if (ci.isFork) {
  console.log('Pull request from a fork: GITHUB_TOKEN is read-only, skipping comment.');
  process.exit(0);
}

await upsertComment(ci.repo, ci.prNumber, COMMENT_MARKER, formatComment(readResults(), ci.runUrl));
