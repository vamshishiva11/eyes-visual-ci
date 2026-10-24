import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

export interface CiContext {
  repo: string;
  headSha: string;
  branch: string;
  parentBranch: string;
  batchId: string;
  batchName: string;
  prNumber: number | null;
  isFork: boolean;
  runUrl: string;
}

type Env = Record<string, string | undefined>;

interface PullRequestEvent {
  pull_request?: {
    number: number;
    head: { sha: string; ref: string; repo: { full_name: string } | null };
    base: { ref: string; repo: { full_name: string } };
  };
}

const DEFAULT_PARENT = 'main';

/**
 * Single source of truth for git context in CI.
 *
 * On `pull_request` events GitHub sets GITHUB_SHA to a synthetic merge commit,
 * which is not the commit the author pushed. The PR head SHA lives only in the
 * event payload, so it is read from there.
 */
export function resolveCiContext(env: Env, event: PullRequestEvent = {}): CiContext {
  const pr = env.GITHUB_EVENT_NAME?.startsWith('pull_request') ? event.pull_request : undefined;
  const repo = env.GITHUB_REPOSITORY ?? 'local/local';

  const headSha = pr?.head.sha ?? env.GITHUB_SHA ?? gitOr('rev-parse HEAD', 'unknown');
  const branch = pr?.head.ref ?? env.GITHUB_REF_NAME ?? gitOr('rev-parse --abbrev-ref HEAD', 'local');
  const parentBranch = pr?.base.ref ?? DEFAULT_PARENT;
  const prNumber = pr?.number ?? null;

  return {
    repo,
    headSha,
    branch,
    parentBranch,
    // Same commit => same batch, so a re-run joins the existing batch instead of opening a second one.
    batchId: headSha,
    batchName: prNumber ? `Visual tests - PR #${prNumber} (${branch})` : `Visual tests - ${branch}`,
    prNumber,
    isFork: pr ? pr.head.repo?.full_name !== pr.base.repo.full_name : false,
    runUrl: env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL ?? 'https://github.com'}/${repo}/actions/runs/${env.GITHUB_RUN_ID}` : '',
  };
}

export function loadCiContext(env: Env = process.env): CiContext {
  const eventPath = env.GITHUB_EVENT_PATH;
  const event = eventPath ? (JSON.parse(readFileSync(eventPath, 'utf8')) as PullRequestEvent) : {};
  return resolveCiContext(env, event);
}

function gitOr(args: string, fallback: string): string {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return fallback;
  }
}
