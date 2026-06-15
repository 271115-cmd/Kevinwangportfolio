# Portfolio — big-type editorial brutalism

A multi-page portfolio for an architecture student. Built with vanilla Vite +
GSAP + Lenis (no framework). The whole site is driven by one data file, so adding
or replacing work is a quick edit + image drop.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the build
```

## Deploy (free, easiest: Netlify drag-and-drop)

1. `npm run build` (creates the `dist/` folder).
2. Go to **https://app.netlify.com/drop** and **drag the `dist` folder** onto the page.
   You get a live `*.netlify.app` URL instantly.
3. Sign up (free, e.g. with GitHub) to keep the site and add a custom domain.

For automatic deploys later, push this repo to GitHub and "Add new site → Import"
in Netlify — `netlify.toml` already sets the build command + publish dir.

## "Read This Building" — the AI tool (`/read.html`)

An AI vision experiment: upload a building photo → Gemini returns a structured reading
(style, elements, materials, cultural context) **and** names its own blind spots.

- **Front-end:** `read.html` + `src/read.js` (downscales the image client-side, then POSTs).
- **AI layer:** `shared/explain.js` (provider isolated here — swappable to Claude later).
- **Server:** `functions/api/read-building.js` — a **Cloudflare Pages Function** that holds the
  API key. Local dev uses an equivalent middleware in `vite.config.js`.
- **Model:** `gemini-2.5-flash` (thinking disabled for reliable JSON).

**Setup — you must provide a Gemini API key** (free at aistudio.google.com):
- **Local:** export `GEMINI_API_KEY=...` in your shell (it's already in `~/.zshenv`), then `npm run dev`.
- **Production:** Cloudflare Pages → Settings → **Environment variables** → add `GEMINI_API_KEY`
  (Production *and* Preview).

> ⚠️ **Deploying this feature needs Functions, which drag-and-drop does NOT include.**
> Static drag-drop only uploads `dist/` (assets) — it won't ship `functions/`. To make the live
> tool work, deploy one of these ways instead:
> - **Connect the repo to Cloudflare Pages via Git** (recommended — auto-builds `functions/` and you set the env var in the dashboard), or
> - run **`npx wrangler pages deploy dist`** from the project root (Wrangler picks up `./functions`), then `npx wrangler pages secret put GEMINI_API_KEY`.
>
> The rest of the site still works fine on drag-drop; only the AI endpoint needs the above.

> 💰 **Cost / abuse:** the endpoint is public, so anyone could call it. Images are downscaled to
> ~1280px to keep calls cheap, and Gemini has a free tier — but if it gets traffic, add
> **Cloudflare Turnstile** or a rate-limit rule in front of `/api/read-building`.

## The Living Central Axis (`/axis.html`) — flagship

An interactive WebGL atlas of Beijing's Central Axis (北京中轴线, UNESCO 2024): a
**scroll-driven camera** travels the 15 sites south→north past **procedurally generated**
white-model architecture (distinct per archetype — gate / tower / palace / temple / altar /
…), with a live narration card, a progress rail, an icon-rich **component list** (click a
row to fly there), a **massing ↔ modern-city ground toggle**, then content sections
(cosmology, timeline, UNESCO facts, the 15 components, sources).

**Architecture (`src/axis/`):** a deterministic, modular system — `state.js` is the single
source of truth (scroll + UI mutate only it; camera/highlight/narration/UI all derive from
it, so they never desync); `scene.js` owns Three.js and reacts only to state; `archetypes.js`
builds grouped low-poly geometry from 3 shared materials; `segments.js` lazy-loads geometry in
a window around the active site (cache + dispose); `ui.js` is fully decoupled from WebGL;
`controller.js` is the bridge. Data + citations + the formal monument schema live in
`src/data/axis.js`. Uses **three** (dynamic-import chunk — only loads on this page).
Inscription facts are research-verified and cited; per-site dates are indicative (noted on-page).

## Pattern Loom (`/loom.html`) & Journal (`/journal.html`)

- **Pattern Loom** — a 100% client-side generative tool for Chinese lattice (冰裂 ice-ray,
  回纹 key-fret, 龟背 tortoiseshell). **No API key or cost** (unlike the AI tool). Logic in
  `src/loom.js`; exports print-ready **SVG** + a **2400px PNG**. Add motifs by extending the
  generators there. Outputs are yours to sell as prints/downloads.
- **Journal / Field Notes** — data-driven posts in `src/data/journal.js` (newest first; `body`
  is HTML). Index at `journal.html`, each post at `post.html?slug=…`, linked in the dropdown.
  The three seed posts are **drafts — rewrite them in your own voice.**

## Make it yours

1. **Your identity** — edit `SITE` at the top of `src/chrome.js` (name, role, email,
   social links, edition). It feeds the header, dropdown footer, and site footer.
2. **Your work** — edit `src/data/projects.js`. Each entry:

   ```js
   { id: 'unique-slug', title: 'Project Title', discipline: 'architecture',
     year: 2025, role: 'Design Studio IV', location: 'Site', tags: ['timber'],
     summary: 'One line shown in the list/card.',
     featured: true,           // surfaces on the home page
     external: null,           // a URL → card opens in a new tab (e.g. a live site)
     cover: null,              // null = generated placeholder; or '/work/<id>/cover.jpg'
     gallery: [] }             // future detail images
   ```

   `discipline` must match a `slug` in `DISCIPLINES`. Dropdown counts, listings, and
   the home "featured" grid are all derived automatically — nothing to hand-update.
   Every internal project also gets a **case-study detail page** for free at
   `project.html?slug=<id>` (title, spec row, image plates, prev/next). External
   entries (with a URL in `external`) open in a new tab instead.

3. **Real images** — drop files in `public/work/<id>/` and point `cover` (and later
   `gallery`) at them, e.g. `cover: '/work/riverbank-pavilion/cover.jpg'`. Until then
   an on-brand brutalist placeholder is generated. Covers ~1600px wide, ~3:2.

4. **The Duyichu piece** — it's the `duyichu-3d` entry in `web`. Replace its
   `external` with the deployed URL and drop a screenshot at
   `public/work/duyichu-3d/cover.jpg`. (Duyichu is a *separate* project — this repo
   only links to it.)

## Design system

- **Accent:** one signal colour — `--accent` (safety orange `#FF3B00`) in
  `src/style.css`. Change one variable to re-skin.
- **Type:** Archivo (display), Space Grotesk (body), Space Mono (labels) — bundled
  offline via `@fontsource`.
- **Motion:** Lenis smooth scroll, GSAP scroll reveals, char-mask hero, a hard-panel
  page-transition wipe, custom cursor + magnetic elements. All reduced-motion safe.

## Structure

```
*.html              one shell per page (home + 5 sections + project.html detail);
                    content is static, shared header/dropdown/footer injected at runtime
project.html        data-driven case-study template, keyed by ?slug=<id>
src/main.js         init order
src/chrome.js       header + dropdown + footer (single source of truth)
src/dropdown.js     the index dropdown (open/close, focus-trap, stagger)
src/transition.js   hard-panel page wipe
src/motion.js       Lenis + ScrollTrigger reveals + hero intro
src/cursor.js       custom cursor + magnetic
src/render.js       data → DOM (featured grid / list rows / gallery)
src/data/           projects.js (the data) + placeholder.js (SVG covers)
```
