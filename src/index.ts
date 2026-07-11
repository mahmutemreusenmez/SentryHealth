import { createServer, PORT } from './infrastructure/web/server.js';
import { env } from './infrastructure/config/env.js';

const app = await createServer();
app.listen(PORT, () => {
  console.log(`SentryHealth listening on port ${PORT} in ${env.NODE_ENV} mode`);
});
