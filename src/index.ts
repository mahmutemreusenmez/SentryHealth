import { pathToFileURL } from 'node:url';
import { createServer, PORT } from './infrastructure/web/server.js';
import { env } from './infrastructure/config/env.js';

const appPromise = createServer();

appPromise.catch((err) => {
  console.error('[SentryHealth] Sunucu başlatılamadı:', err);
});

export default async function handler(req: any, res: any) {
  try {
    const app = await appPromise;
    app(req, res);
  } catch (err) {
    console.error('[SentryHealth] İstek işlenemedi, sunucu başlatılamamıştı:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Sunucu başlatılamadı.' }));
  }
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (!process.env.VERCEL && isMain) {
  try {
    const app = await appPromise;
    app.listen(PORT, () => {
      console.log(`SentryHealth listening on port ${PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err) {
    console.error('[SentryHealth] Sunucu başlatılamadı, süreç sonlandırılıyor:', err);
    process.exit(1);
  }
}
