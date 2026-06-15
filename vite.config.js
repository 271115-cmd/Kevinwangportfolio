import { resolve } from 'path';
import { defineConfig } from 'vite';
import { readBuilding } from './shared/explain.js';

// Dev-only middleware so POST /api/read-building works under `npm run dev`
// (in production this is a Cloudflare Pages Function). Reads GEMINI_API_KEY
// from the shell environment.
function readBuildingDevApi() {
  return {
    name: 'read-building-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/read-building', async (req, res) => {
        const send = (obj, status = 200) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(obj));
        };
        if (req.method !== 'POST') return send({ error: 'Use POST.' }, 405);
        try {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const { image, mimeType, note } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if (!image) return send({ error: 'No image provided.' }, 400);
          const key = process.env.GEMINI_API_KEY;
          if (!key) return send({ error: 'Local dev is missing GEMINI_API_KEY in the environment.' }, 500);
          const result = await readBuilding({ apiKey: key, imageBase64: image, mimeType: mimeType || 'image/jpeg', note });
          send({ result });
        } catch (e) {
          send({ error: String(e?.message || e) }, 502);
        }
      });
    },
  };
}

// Multi-page build — one rollup entry per HTML shell. Each page is independently
// indexable (own <title>/meta); the shared chrome (header/dropdown/footer) is
// injected at runtime by src/chrome.js so there is a single source of truth.
export default defineConfig({
  plugins: [readBuildingDevApi()],
  build: {
    rollupOptions: {
      input: {
        main:         resolve(__dirname, 'index.html'),
        architecture: resolve(__dirname, 'architecture.html'),
        models:       resolve(__dirname, 'models.html'),
        graphic:      resolve(__dirname, 'graphic.html'),
        objects:      resolve(__dirname, 'objects.html'),
        web:          resolve(__dirname, 'web.html'),
        about:        resolve(__dirname, 'about.html'),
        project:      resolve(__dirname, 'project.html'),
        read:         resolve(__dirname, 'read.html'),
        loom:         resolve(__dirname, 'loom.html'),
        axis:         resolve(__dirname, 'axis.html'),
        journal:      resolve(__dirname, 'journal.html'),
        post:         resolve(__dirname, 'post.html'),
        notfound:     resolve(__dirname, '404.html'),
      },
    },
  },
});
