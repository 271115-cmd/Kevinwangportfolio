/* ============================================================
   contact.js — progressive-enhancement client for the About
   contact form. Posts to /api/contact (the Worker saves a copy
   to KV and emails the submission). Loaded on demand by main.js.
   Without JS the form still shows the mailto fallback beside it.
   ============================================================ */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function setStatus(el, kind, msg) {
  el.hidden = false;
  el.className = `cf-status is-${kind}`;
  el.innerHTML = `<span class="mono">${kind === 'error' ? '⚠ ' : ''}${esc(msg)}</span>`;
}

export function initContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = form.querySelector('.cf-status');
  const submit = form.querySelector('.cf-submit');
  const val = (n) => (form.querySelector(`[name="${n}"]`)?.value ?? '');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: val('name').trim(),
      email: val('email').trim(),
      message: val('message').trim(),
      company: val('company'),   // honeypot — real people leave this empty
    };

    if (!data.name || !data.email || !data.message) {
      setStatus(status, 'error', 'Please add your name, email, and a message.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
      setStatus(status, 'error', 'That email address looks off — mind checking it?');
      return;
    }

    submit.disabled = true;
    setStatus(status, 'loading', 'Sending…');
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const out = await resp.json().catch(() => ({}));
      if (!resp.ok || out.error) throw new Error(out.error || `Couldn't send (${resp.status}).`);
      form.reset();
      setStatus(status, 'ok', 'Thank you — your message is on its way. I’ll be in touch.');
    } catch (err) {
      setStatus(status, 'error', `${err.message} Or email kevinwang6699@outlook.com directly.`);
    } finally {
      submit.disabled = false;
    }
  });
}
