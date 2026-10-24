import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, needsReview, type ResultLike } from '../scripts/results.ts';
import { formatComment, statusFor, COMMENT_MARKER } from '../scripts/format.ts';

const fake = (name: string, status: string, isNew = false, error?: Error): ResultLike => ({
  getException: () => error,
  getTestResults: () => ({
    getName: () => name,
    getStatus: () => status,
    getIsNew: () => isNew,
    getUrl: () => `https://eyes.test/${name}`,
    getAppUrls: () => ({ getBatch: () => 'https://eyes.test/batch' }),
  }),
});

test('summarize counts passed, new, unresolved and failed', () => {
  const r = summarize('abc1234', [fake('a', 'Passed'), fake('b', 'Passed', true), fake('c', 'Unresolved'), fake('d', 'Failed', false, new Error('x'))]);
  assert.deepEqual([r.passed, r.new, r.unresolved, r.failed], [1, 1, 1, 1]);
  assert.equal(r.batchUrl, 'https://eyes.test/batch');
});

test('a diff reported with an exception is unresolved, not failed', () => {
  const r = summarize('abc1234', [fake('a', 'Unresolved', false, new Error('detected differences!'))]);
  assert.deepEqual([r.unresolved, r.failed], [1, 0]);
});

test('unresolved results fail the status and the gate', () => {
  const r = summarize('abc1234', [fake('a', 'Unresolved')]);
  assert.equal(needsReview(r), true);
  assert.equal(statusFor(r).state, 'failure');
});

test('new baselines alone are a pass', () => {
  const r = summarize('abc1234', [fake('a', 'Passed', true)]);
  assert.equal(statusFor(r).state, 'success');
});

test('comment carries the marker used for upserts', () => {
  const body = formatComment(summarize('abc1234', [fake('a', 'Passed')]));
  assert.ok(body.startsWith(COMMENT_MARKER));
  assert.match(body, /Open the batch in Eyes/);
});
