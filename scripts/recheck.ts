import { fetchBatchResults } from './eyes-api.ts';
import { COMMENT_MARKER, formatComment, statusFor } from './format.ts';
import { gh, setCommitStatus, upsertComment } from './github.ts';

/**
 * Refreshes the PR comment and commit status from Eyes without re-running any tests.
 * Use it after differences are accepted or rejected in the Eyes dashboard, which GitHub is never told about.
 */
const repo = process.env.GITHUB_REPOSITORY ?? '';
const prNumber = Number(process.env.PR_NUMBER);
if (!repo || !Number.isInteger(prNumber)) throw new Error('GITHUB_REPOSITORY and a numeric PR_NUMBER are required.');

const pr = await gh<{ head: { sha: string; repo: { full_name: string } | null } }>('GET', `/repos/${repo}/pulls/${prNumber}`);
const headSha = pr.head.sha;

const results = await fetchBatchResults(headSha);
const runUrl = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';

await upsertComment(repo, prNumber, COMMENT_MARKER, formatComment(results, runUrl));
await setCommitStatus(repo, headSha, { ...statusFor(results), targetUrl: results.batchUrl || runUrl });
