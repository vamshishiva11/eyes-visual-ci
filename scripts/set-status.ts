import { loadCiContext } from './ci-context.ts';
import { readResults } from './results.ts';
import { statusFor } from './format.ts';
import { setCommitStatus } from './github.ts';

const ci = loadCiContext();
if (ci.isFork) {
  console.log('Pull request from a fork: GITHUB_TOKEN is read-only, skipping status.');
  process.exit(0);
}

const results = readResults();

// Always the PR head commit, never the merge commit GitHub checked out.
await setCommitStatus(ci.repo, ci.headSha, { ...statusFor(results), targetUrl: results.batchUrl || ci.runUrl });
