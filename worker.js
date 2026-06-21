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

    // Contact form — saves a copy to KV (if bound) and emails via Resend (if
    // RESEND_API_KEY is set). Either sink alone is enough to accept a message.
    if (pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
      try {
        const body = await request.json().catch(() => ({}));
        const name = String(body.name || '').trim().slice(0, 120);
        const email = String(body.email || '').trim().slice(0, 160);
        const message = String(body.message || '').trim().slice(0, 3000);

        // Honeypot: real people leave `company` empty; bots fill hidden fields.
        if (String(body.company || '').trim()) return json({ ok: true });

        if (!name || !email || !message) return json({ error: 'Please include your name, email, and a message.' }, 400);
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'That email address looks invalid.' }, 400);

        const record = {
          name, email, message,
          at: new Date().toISOString(),
          country: request.cf?.country || '',
          ua: request.headers.get('user-agent') || '',
        };

        let saved = false, emailed = false;

        // 1) Durable copy in Cloudflare KV (skipped if the binding isn't set up yet).
        if (env.CONTACTS) {
          try {
            const key = `msg:${record.at}:${Math.random().toString(36).slice(2, 8)}`;
            await env.CONTACTS.put(key, JSON.stringify(record));
            saved = true;
          } catch { /* fall through to email */ }
        }

        // 2) Email notification via Resend (works without a custom domain).
        if (env.RESEND_API_KEY) {
          const to = env.CONTACT_TO || 'kevinwang6699@outlook.com';
          const from = env.CONTACT_FROM || 'Portfolio <onboarding@resend.dev>';
          const safe = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
            body: JSON.stringify({
              from, to, reply_to: email,
              subject: `Portfolio — new message from ${name}`,
              text: `From: ${name} <${email}>\n\n${message}\n\n— sent ${record.at}${record.country ? ' · ' + record.country : ''}`,
              html: `<p><strong>${safe(name)}</strong> &lt;${safe(email)}&gt; wrote:</p>`
                + `<p style="white-space:pre-wrap">${safe(message)}</p>`
                + `<hr><p style="color:#888;font-size:12px">Sent ${record.at}${record.country ? ' · ' + safe(record.country) : ''} · reply to this email to respond.</p>`,
            }),
          });
          emailed = r.ok;
        }

        if (!saved && !emailed) {
          return json({ error: 'The contact form isn’t fully set up yet — please email kevinwang6699@outlook.com directly.' }, 503);
        }
        return json({ ok: true });
      } catch (e) {
        return json({ error: String(e?.message || e) }, 502);
      }
    }

    // Not the API and no static asset matched → serve the 404 page.
    const res = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url), request));
    return new Response(res.body, { status: 404, headers: res.headers });
  },
};
