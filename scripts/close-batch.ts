import { BatchClose } from '@applitools/eyes-playwright';
import { loadCiContext } from './ci-context.ts';

// Safety net for cancelled or crashed runs. Closing an already-closed batch is harmless, so this runs on always().
const { batchId } = loadCiContext();
await BatchClose.close({
  batchIds: [batchId],
  serverUrl: process.env.APPLITOOLS_SERVER_URL ?? 'https://eyesapi.applitools.com',
  apiKey: process.env.APPLITOOLS_API_KEY ?? '',
});
console.log(`Closed batch ${batchId}`);
