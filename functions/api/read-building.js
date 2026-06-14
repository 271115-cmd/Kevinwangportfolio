/* ============================================================
   Cloudflare Pages Function — POST /api/read-building
   Proxies the image to Gemini so the API key stays server-side.
   Set the secret in: Cloudflare Pages → Settings → Environment
   variables → GEMINI_API_KEY (Production + Preview).
   ============================================================ */

import { readBuilding } from '../../shared/explain.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  try {
    if (!env.GEMINI_API_KEY) return json({ error: 'Server not configured: missing GEMINI_API_KEY.' }, 500);

    const { image, mimeType, note } = await request.json().catch(() => ({}));
    if (!image) return json({ error: 'No image provided.' }, 400);
    // base64 is ~1.33x the byte size; ~8M chars ≈ a 6 MB image
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
// (Other HTTP methods automatically receive 405 since only POST is handled.)
