import { defineConfig } from '@playwright/test';
import type { EyesFixture } from '@applitools/eyes-playwright/fixture';
import { loadCiContext } from './scripts/ci-context.ts';
import { summarize, writeResults } from './scripts/results.ts';

const ci = loadCiContext();

export default defineConfig<EyesFixture>({
  testDir: './tests',
  reporter: [['list']],
  webServer: {
    command: 'node --import tsx scripts/serve-app.ts',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:4173',
    eyesConfig: {
      type: 'classic',
      appName: 'Brewline',
      batch: { id: ci.batchId, name: ci.batchName },
      branchName: ci.branch,
      parentBranchName: ci.parentBranch,
      // Diffs must not abort the run: we report them on the PR and decide pass/fail ourselves.
      failTestsOnDiff: false,
      afterAll: async (containers) => writeResults(summarize(ci.headSha, containers)),
    },
  },
});
