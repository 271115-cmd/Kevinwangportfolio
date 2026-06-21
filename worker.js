/* ============================================================
   worker.js — Cloudflare Worker entry for `wrangler deploy`.
   Serves the built static site from ./dist (via the ASSETS
   binding — assets are matched first, so real pages are served
   directly) and handles POST /api/read-building, keeping the
   Gemini key server-side. Mirrors functions/api/read-building.js
   so the AI tool works on the Workers deploy too.
   ============================================================ */

import { readBuilding } from './shared/explain.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/read-building') {
      if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
      try {
        if (!env.GEMINI_API_KEY) return json({ error: 'Server not configured: missing GEMINI_API_KEY.' }, 500);
        const { image, mimeType, note } = await request.json().catch(() => ({}));
        if (!image) return json({ error: 'No image provided.' }, 400);
        if (image.length > 8_000_000) return json({ error: 'Image too large (max ~6 MB).' }, 413);
        const result = await readBuilding({
          apiKey: env.GEMINI_API_KEY,
          imageBase64: image,
          mimeType: mimeType || 'image/jpeg',
          note: (note || '').slice(0, 300),
        });
        return json({ result });
      } catch (e) {
        return json({ error: String(e?.message || e) }, 502);
      }
    }

    // Not the API and no static asset matched → serve the 404 page.
    const res = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url), request));
    return new Response(res.body, { status: 404, headers: res.headers });
  },
};
