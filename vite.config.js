import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import visitorsHandler from './api/visitors.js';

// npm run dev 에서도 Vercel 서버리스 함수(/api/visitors)와 똑같이 동작하게 해주는 개발용 플러그인
function visitorsDevApi(env) {
  return {
    name: 'visitors-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/visitors', async (req, res) => {
        process.env.DATA_GO_KR_KEY = env.DATA_GO_KR_KEY || '';
        const url = new URL(req.url, 'http://localhost');
        req.query = Object.fromEntries(url.searchParams);
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(obj));
        };
        try {
          await visitorsHandler(req, res);
        } catch (e) {
          res.status(500).json({ error: String(e.message || e) });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // VITE_ 접두사 없는 변수(DATA_GO_KR_KEY)도 읽음
  return { plugins: [react(), visitorsDevApi(env)] };
});
