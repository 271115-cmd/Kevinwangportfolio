import { resolve } from 'path';
import { defineConfig } from 'vite';
import { readBuilding } from './shared/explain.js';
import { listHTML, galleryHTML, journalHTML } from './src/render-html.js';
import { countFor, PROJECTS } from './src/data/projects.js';

// Canonical host (matches sitemap.xml / robots.txt). Update both if a custom domain lands.
const HOST = 'https://kevinwangporfolio.pages.dev';

// Build-time prerender: inject the data-driven page bodies (discipline lists/
// galleries, journal) into the static HTML so crawlers/social scrapers and
// no-JS visitors get real content + a per-page canonical — not an empty shell.
// The client still hydrates identically over it. Robust: any failure falls back
// to the client-rendered shell rather than breaking the build.
function addClass(openTag, cls) {
  if (!cls) return openTag;
  return /\bclass="/.test(openTag)
    ? openTag.replace(/\bclass="([^"]*)"/, (_m, c) => `class="${c} ${cls}"`)
    : openTag.replace(/>$/, ` class="${cls}">`);
}
function prerenderContent() {
  return {
    name: 'prerender-content',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        let out = html;
        const path = ctx.path || '/';
        // 1. inject body content into each data-render mount
        out = out.replace(
          /(<(section|div|article)\b[^>]*\bdata-render="(list|gallery|journal)"[^>]*>)(\s*)(<\/\2>)/g,
          (m, open, _tag, kind, _ws, close) => {
            try {
              const slug = (open.match(/data-slug="([^"]+)"/) || [])[1] || '';
              const built = kind === 'list' ? { html: listHTML(slug), cls: 'proj-list' }
                : kind === 'gallery' ? { html: galleryHTML(slug), cls: 'gallery' }
                : { html: journalHTML(), cls: 'jr-list' };
              return addClass(open, built.cls) + built.html + close;
            } catch { return m; }
          },
        );
        // 2. fill the discipline/total counts in the static heads
        out = out.replace(/(<span[^>]*\bdata-count-for="([^"]+)"[^>]*>)[^<]*(<\/span>)/g,
          (_m, open, slug, close) => open + String(countFor(slug)).padStart(2, '0') + close);
        out = out.replace(/(<span[^>]*\bdata-count-total[^>]*>)[^<]*(<\/span>)/g,
          (_m, open, close) => open + PROJECTS.length + close);
        // 3. bake a static canonical + og:url (skip the ?slug-routed pages — JS sets those)
        if (!/\/(project|post)\.html$/.test(path) && !/rel="canonical"/.test(out)) {
          const url = HOST + (path === '/' || path === '/index.html' ? '/' : path);
          out = out.replace(/<\/head>/,
            `  <link rel="canonical" href="${url}" />\n  <meta property="og:url" content="${url}" />\n</head>`);
        }
        return out;
      },
    },
  };
}

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
  plugins: [readBuildingDevApi(), prerenderContent()],
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
