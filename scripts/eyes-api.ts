import type { EyesResults, TestSummary } from './results.ts';

interface BatchResponse {
  batchUrl?: string;
  statistics: { passed: number; new: number; unresolved: number; failed: number; aborted: number };
  tests?: { testName: string; sessionUrl: string; status: string }[];
}

const SERVER = process.env.APPLITOOLS_SERVER_URL ?? 'https://eyes.applitools.com';

/** Maps the Eyes REST response onto the same shape the test run writes, so comment and status code is shared. */
export function fromBatchResponse(headSha: string, r: BatchResponse): EyesResults {
  const { statistics: s } = r;
  return {
    headSha,
    passed: s.passed,
    new: s.new,
    unresolved: s.unresolved,
    failed: s.failed + s.aborted,
    batchUrl: r.batchUrl ?? '',
    tests: (r.tests ?? []).map((t) => ({
      name: t.testName,
      status: t.status.toLowerCase() as TestSummary['status'],
      url: t.sessionUrl,
    })),
  };
}

/** The batch ID we set is the commit SHA, which Eyes accepts as the batch's pointer ID. */
export async function fetchBatchResults(headSha: string, apiKey = process.env.APPLITOOLS_API_KEY ?? ''): Promise<EyesResults> {
  const res = await fetch(`${SERVER}/api/v1/batches/${headSha}`, { headers: { 'X-Eyes-Api-Key': apiKey } });
  if (!res.ok) throw new Error(`Eyes GET batch ${headSha} -> ${res.status}: ${await res.text()}`);
  return fromBatchResponse(headSha, (await res.json()) as BatchResponse);
}
