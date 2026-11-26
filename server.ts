import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer } from 'ws';
import { SnowbrawlGameServer } from './server/gameEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const gameServer = new SnowbrawlGameServer();

  wss.on('connection', (ws) => {
    gameServer.handleConnection(ws);
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: gameServer.getPublicRooms().length });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: gameServer.getPublicRooms() });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true' ? { server } : false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Snowbrawl Arena server listening on http://0.0.0.0:${port}`);
  });

  process.on('SIGTERM', () => {
    gameServer.dispose();
    server.close();
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
