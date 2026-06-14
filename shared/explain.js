/* ============================================================
   explain.js — the AI layer for "Read This Building".
   Shared by the Cloudflare Pages Function (production) and the
   Vite dev middleware (local). Provider is isolated here, so it
   can be swapped (e.g. to Claude) by changing this one file.
   Uses the global `fetch` (present in Node 18+ and on the edge).
   ============================================================ */

export const MODEL = 'gemini-2.5-flash';

export const SYSTEM = `You are "Read This Building" — a sharp, well-read, but intellectually HONEST architectural reader.
A visitor shows you a single photograph. You describe what you see using correct architectural vocabulary,
then you openly name the limits of your own reading.

Return ONLY a JSON object with EXACTLY this shape (no markdown, no prose outside the JSON):
{
  "isBuilding": boolean,        // false if the image is not architecture / a building
  "title": string,             // short label, e.g. "Brick terrace house, likely early-20th-c."
  "style": string,             // architectural style/idiom; hedge if unsure
  "period": string,            // approximate era; hedge
  "region": string,            // likely region / culture; hedge
  "elements": string[],        // 3-6 specific elements you can ACTUALLY see (e.g. "corbelled brick cornice")
  "materials": string[],       // visible or likely materials
  "culturalContext": string,   // 2-4 sentences: what this building suggests about its culture, use, or history
  "confidence": "high" | "medium" | "low",
  "blindSpots": string[],      // 2-4 honest caveats (this is the POINT of the tool)
  "summary": string            // one punchy sentence
}

Rules:
- Be specific and use real architectural terms, but HEDGE when uncertain ("appears to", "likely", "reads as").
- blindSpots is the heart of this tool. In it, name: (a) what you are guessing vs. seeing, (b) what one photo
  simply cannot tell you, and (c) where your own training may bias the reading — be candid that AI models are
  trained heavily on Western, canonical, professionally-photographed architecture and therefore tend to
  over-confidently fit vernacular, non-Western, or everyday buildings into Western categories. Be humble and specific,
  not generic.
- If isBuilding is false, still return the full shape: brief note in "summary", empty arrays, confidence "low".
- Output the JSON and nothing else.`;

/**
 * @param {{apiKey:string, imageBase64:string, mimeType?:string, note?:string}} opts
 * @returns {Promise<object>} parsed analysis
 */
export async function readBuilding({ apiKey, imageBase64, mimeType = 'image/jpeg', note = '' }) {
  if (!apiKey) throw new Error('Missing API key');
  if (!imageBase64) throw new Error('Missing image');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const userText = note ? `Visitor's note: ${note}\n\nRead this building.` : 'Read this building.';

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{
      role: 'user',
      parts: [
        { text: userText },
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 }, // 2.5-flash thinks by default; off = reliable, untruncated JSON
    },
  };

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Gemini ${r.status}: ${t.slice(0, 300)}`);
  }

  const data = await r.json();
  const finish = data?.candidates?.[0]?.finishReason;
  let text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
  if (!text) throw new Error(`Empty response${finish ? ` (finishReason: ${finish})` : ''}`);

  // be resilient: strip ```json fences, else extract the first {...} block
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  let parsed = null;
  try { parsed = JSON.parse(text); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch { /* fall through */ } }
  }
  if (!parsed) throw new Error(`Model did not return valid JSON${finish ? ` (finishReason: ${finish})` : ''}`);
  return parsed;
}
