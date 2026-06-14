/* ============================================================
   read.js — client for "Read This Building".
   Handles upload/drag-drop + samples, downscales the image
   (cheaper/faster), posts to /api/read-building, and renders the
   structured, self-critical reading. Loaded on demand by main.js.
   ============================================================ */

const MAX_DIM = 1280;          // downscale longest edge before upload
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let current = null;            // { base64, mimeType }

function downscaleToBase64(srcUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: dataUrl });
    };
    img.onerror = () => reject(new Error('Could not load that image.'));
    img.src = srcUrl;
  });
}

async function setImage(srcUrl, els) {
  els.status.hidden = true;
  els.result.hidden = true;
  try {
    const { base64, mimeType, preview } = await downscaleToBase64(srcUrl);
    current = { base64, mimeType };
    els.preview.src = preview;
    els.preview.hidden = false;
    els.drop.classList.add('has-image');
    els.go.disabled = false;
  } catch (e) {
    showError(els, e.message);
  }
}

function showError(els, msg) {
  els.status.hidden = false;
  els.status.className = 'read-status is-error';
  els.status.innerHTML = `<span class="mono">⚠ ${esc(msg)}</span>`;
}

function showLoading(els) {
  els.result.hidden = true;
  els.status.hidden = false;
  els.status.className = 'read-status is-loading';
  els.status.innerHTML = `<span class="read-spinner" aria-hidden="true"></span><span class="mono">Reading the building…</span>`;
}

function chip(s) { return `<li>${esc(s)}</li>`; }

function render(els, r) {
  els.status.hidden = true;
  els.result.hidden = false;

  if (r.isBuilding === false) {
    els.result.innerHTML =
      `<div class="rr-head"><span class="rr-conf mono">no building detected</span>
       <h2 class="rr-title">Hm — that doesn't look like architecture.</h2>
       <p class="rr-summary">${esc(r.summary || 'Try a photo of a building or structure.')}</p></div>`;
    els.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  const meta = [
    r.style && ['Style', r.style],
    r.period && ['Period', r.period],
    r.region && ['Region', r.region],
  ].filter(Boolean).map(([k, v]) => `<div class="rr-meta-row"><span class="rr-k mono">${esc(k)}</span><span class="rr-v">${esc(v)}</span></div>`).join('');

  const list = (title, arr) => (arr && arr.length)
    ? `<div class="rr-block"><h3 class="rr-h mono">${esc(title)}</h3><ul class="rr-list">${arr.map(chip).join('')}</ul></div>` : '';

  els.result.innerHTML =
    `<div class="rr-head">
       <span class="rr-conf mono rr-conf-${esc(r.confidence || 'low')}">confidence: ${esc(r.confidence || '—')}</span>
       <h2 class="rr-title">${esc(r.title || 'A building')}</h2>
       <p class="rr-summary">${esc(r.summary || '')}</p>
     </div>
     <div class="rr-grid">
       <div class="rr-col">
         ${meta ? `<div class="rr-block"><h3 class="rr-h mono">Reading</h3>${meta}</div>` : ''}
         ${list('Elements', r.elements)}
         ${list('Materials', r.materials)}
       </div>
       <div class="rr-col">
         ${r.culturalContext ? `<div class="rr-block"><h3 class="rr-h mono">Cultural context</h3><p class="rr-body">${esc(r.culturalContext)}</p></div>` : ''}
       </div>
     </div>
     <div class="rr-blind">
       <h3 class="rr-h mono">Blind spots — what the AI is guessing or likely getting wrong</h3>
       <ul class="rr-list rr-blind-list">${(r.blindSpots || ['(none returned)']).map(chip).join('')}</ul>
     </div>`;
  els.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function run(els) {
  if (!current) return;
  showLoading(els);
  els.go.disabled = true;
  try {
    const resp = await fetch('/api/read-building', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: current.base64, mimeType: current.mimeType, note: els.note.value.trim() }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.error) throw new Error(data.error || `Request failed (${resp.status})`);
    render(els, data.result);
  } catch (e) {
    showError(els, e.message);
  } finally {
    els.go.disabled = false;
  }
}

export function initRead() {
  const root = document.getElementById('read-app');
  if (!root) return;
  const els = {
    drop: document.getElementById('read-drop'),
    file: document.getElementById('read-file'),
    preview: document.getElementById('read-preview'),
    go: document.getElementById('read-go'),
    note: document.getElementById('read-note'),
    status: document.getElementById('read-status'),
    result: document.getElementById('read-result'),
  };

  els.file.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) setImage(URL.createObjectURL(f), els);
  });

  // drag & drop
  ['dragenter', 'dragover'].forEach((ev) => els.drop.addEventListener(ev, (e) => {
    e.preventDefault(); els.drop.classList.add('is-drag');
  }));
  ['dragleave', 'drop'].forEach((ev) => els.drop.addEventListener(ev, (e) => {
    e.preventDefault(); els.drop.classList.remove('is-drag');
  }));
  els.drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type.startsWith('image/')) setImage(URL.createObjectURL(f), els);
  });
  els.drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.file.click(); }
  });

  // samples
  root.querySelectorAll('.read-sample').forEach((b) => {
    b.addEventListener('click', () => setImage(b.dataset.src, els));
  });

  els.go.addEventListener('click', () => run(els));
}
