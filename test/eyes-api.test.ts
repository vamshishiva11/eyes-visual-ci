import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromBatchResponse } from '../scripts/eyes-api.ts';
import { needsReview } from '../scripts/results.ts';
import { statusFor } from '../scripts/format.ts';

const stats = { passed: 0, new: 0, unresolved: 0, failed: 0, aborted: 0 };

test('accepted differences turn the status green', () => {
  const before = fromBatchResponse('abc1234', { statistics: { ...stats, unresolved: 5 } });
  const after = fromBatchResponse('abc1234', { statistics: { ...stats, passed: 5 } });
  assert.equal(statusFor(before).state, 'failure');
  assert.equal(statusFor(after).state, 'success');
});

test('aborted tests count as failed', () => {
  const r = fromBatchResponse('abc1234', { statistics: { ...stats, aborted: 1 } });
  assert.equal(r.failed, 1);
  assert.equal(needsReview(r), true);
});

test('tests carry name, lowercase status and session url', () => {
  const r = fromBatchResponse('abc1234', {
    batchUrl: 'https://eyes.test/batch',
    statistics: { ...stats, passed: 1 },
    tests: [{ testName: 'home', sessionUrl: 'https://eyes.test/s1', status: 'Passed' }],
  });
  assert.deepEqual(r.tests, [{ name: 'home', status: 'passed', url: 'https://eyes.test/s1' }]);
  assert.equal(r.batchUrl, 'https://eyes.test/batch');
});
