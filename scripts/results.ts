import { writeFileSync, readFileSync } from 'node:fs';

export interface TestSummary {
  name: string;
  status: 'passed' | 'new' | 'unresolved' | 'failed';
  url: string;
}

export interface EyesResults {
  headSha: string;
  passed: number;
  new: number;
  unresolved: number;
  failed: number;
  batchUrl: string;
  tests: TestSummary[];
}

export const RESULTS_FILE = 'eyes-results.json';

/** The subset of the SDK's TestResultContainer that we read, so this stays testable without the SDK. */
export interface ResultLike {
  getException(): Error | undefined | null;
  getTestResults(): {
    getName(): string;
    getStatus(): string;
    getIsNew(): boolean;
    getUrl(): string;
    getAppUrls(): { getBatch(): string };
  } | undefined;
}

export function summarize(headSha: string, containers: ResultLike[]): EyesResults {
  const tests: TestSummary[] = containers.map((c) => {
    const r = c.getTestResults();
    // A diff also surfaces as an exception, so only treat the exception as a failure when there is no result to read.
    if (!r) return { name: 'unknown', status: 'failed', url: '' };
    const status = r.getIsNew() ? 'new' : (r.getStatus().toLowerCase() as TestSummary['status']);
    return { name: r.getName(), status, url: r.getUrl() };
  });
  const count = (s: TestSummary['status']) => tests.filter((t) => t.status === s).length;
  const batchUrl = containers.map((c) => c.getTestResults()?.getAppUrls().getBatch()).find(Boolean) ?? '';
  return { headSha, passed: count('passed'), new: count('new'), unresolved: count('unresolved'), failed: count('failed'), batchUrl, tests };
}

export const writeResults = (results: EyesResults, path = RESULTS_FILE) =>
  writeFileSync(path, JSON.stringify(results, null, 2));

export const readResults = (path = RESULTS_FILE): EyesResults => JSON.parse(readFileSync(path, 'utf8'));

/** Unresolved or failed tests mean a human must look before this can merge. */
export const needsReview = (r: EyesResults) => r.unresolved > 0 || r.failed > 0;
