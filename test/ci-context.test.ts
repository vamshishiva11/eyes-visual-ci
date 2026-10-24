import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveCiContext } from '../scripts/ci-context.ts';

const prEvent = JSON.parse(readFileSync(new URL('./fixtures/pr-event.json', import.meta.url), 'utf8'));
const MERGE_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

test('PR uses the head SHA, not the merge commit in GITHUB_SHA', () => {
  const ctx = resolveCiContext(
    { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: MERGE_SHA, GITHUB_REF_NAME: '7/merge', GITHUB_REPOSITORY: 'me/repo' },
    prEvent,
  );
  assert.equal(ctx.headSha, prEvent.pull_request.head.sha);
  assert.equal(ctx.batchId, prEvent.pull_request.head.sha);
  assert.equal(ctx.branch, 'feature/new-button');
  assert.equal(ctx.parentBranch, 'main');
  assert.equal(ctx.prNumber, 7);
  assert.equal(ctx.isFork, false);
});

test('push to main uses GITHUB_SHA and main as branch', () => {
  const ctx = resolveCiContext({ GITHUB_EVENT_NAME: 'push', GITHUB_SHA: MERGE_SHA, GITHUB_REF_NAME: 'main', GITHUB_REPOSITORY: 'me/repo' });
  assert.equal(ctx.headSha, MERGE_SHA);
  assert.equal(ctx.branch, 'main');
  assert.equal(ctx.prNumber, null);
});

test('same commit gives the same batch id (re-run joins the batch)', () => {
  const env = { GITHUB_EVENT_NAME: 'pull_request', GITHUB_SHA: MERGE_SHA, GITHUB_RUN_ID: '1' };
  const again = { ...env, GITHUB_RUN_ID: '2' };
  assert.equal(resolveCiContext(env, prEvent).batchId, resolveCiContext(again, prEvent).batchId);
});

test('detects fork PRs', () => {
  const fork = structuredClone(prEvent);
  fork.pull_request.head.repo.full_name = 'someone/repo';
  assert.equal(resolveCiContext({ GITHUB_EVENT_NAME: 'pull_request' }, fork).isFork, true);
});
