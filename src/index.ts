import { pathToFileURL } from 'node:url';
import { createServer, PORT } from './infrastructure/web/server.js';
import { env } from './infrastructure/config/env.js';

const appPromise = createServer();

export default async function handler(req: any, res: any) {
  const app = await appPromise;
  app(req, res);
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (!process.env.VERCEL && isMain) {
  const app = await appPromise;
  app.listen(PORT, () => {
    console.log(`SentryHealth listening on port ${PORT} in ${env.NODE_ENV} mode`);
  });
}
