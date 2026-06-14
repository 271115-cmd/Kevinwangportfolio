/* ============================================================
   PROJECTS — single source of truth for the whole site.
   Edit this file to add/replace work. Drop real images in
   public/work/<id>/ and point `cover` (and `gallery`) at them.
   Dropdown counts, listings, and the home "featured" grid are
   all DERIVED from this data — never hand-maintained.
   ============================================================ */

export const DISCIPLINES = [
  { slug: 'architecture', index: '01', label: 'Architecture', blurb: 'Studio · built · speculative', page: '/architecture.html' },
  { slug: 'models',       index: '02', label: 'Models',       blurb: '3D & visualisation',           page: '/models.html' },
  { slug: 'graphic',      index: '03', label: 'Graphic',      blurb: 'Identity · print · type',      page: '/graphic.html' },
  { slug: 'objects',      index: '04', label: 'Objects',      blurb: 'Game & object design',         page: '/objects.html' },
  { slug: 'web',          index: '05', label: 'Web',          blurb: 'Interactive · digital',        page: '/web.html' },
  { slug: 'about',        index: '06', label: 'About',        blurb: 'Bio · CV · contact',           page: '/about.html', isMeta: true },
];

/* render style per discipline page: 'list' = editorial index rows,
   'gallery' = image-forward grid. */
export const LAYOUT = {
  architecture: 'list',
  models: 'gallery',
  graphic: 'gallery',
  objects: 'gallery',
  web: 'list',
};

export const PROJECTS = [
  // ---------------- ARCHITECTURE ----------------
  { id: 'cubist-exhibition-center', title: 'Cubist Exhibition Center', discipline: 'architecture', year: 2025,
    role: 'Design Studio', location: '—', tags: ['cubism', 'exhibition', 'faceted'],
    summary: 'An exhibition hall whose faceted planes are derived from a study of Picasso’s Cubist canvases.',
    featured: true, external: null,
    cover: '/work/cubist-exhibition-center/cover.jpg',
    gallery: ['/work/cubist-exhibition-center/01.jpg', '/work/cubist-exhibition-center/02.jpg', '/work/cubist-exhibition-center/03.jpg', '/work/cubist-exhibition-center/04.jpg'] },

  { id: 'qianmen-derive', title: 'Qianmen Dérive', discipline: 'architecture', year: 2025,
    role: 'Urban analysis', location: 'Qianmen, Beijing', tags: ['collage', 'urbanism', 'dérive'],
    summary: 'A walked reading of Qianmen Street, recomposed as a single winding photo-collage.',
    featured: true, external: null,
    cover: '/work/qianmen-derive/cover.jpg',
    gallery: ['/work/qianmen-derive/01.jpg', '/work/qianmen-derive/02.jpg'] },

  { id: 'central-axis', title: 'Central Axis', discipline: 'architecture', year: 2024,
    role: 'Research & model', location: 'Beijing', tags: ['feng-shui', 'bagua', 'axis'],
    summary: 'Reading Beijing’s central axis through a bagua / feng-shui analytical frame.',
    featured: false, external: null,
    cover: '/work/central-axis/cover.jpg',
    gallery: ['/work/central-axis/01.png'] },

  // ---------------- MODELS (3D / visualisation) ----------------
  { id: 'time-building', title: 'Time Building', discipline: 'models', year: 2025,
    role: 'Rhino · Unreal', location: 'Huzhou', tags: ['rhino', 'unreal', 'render'],
    summary: 'A civic “time” building — oculus roof over a stepped hall, modelled and rendered in Unreal.',
    featured: true, external: null,
    cover: '/work/time-building/cover.jpg',
    gallery: ['/work/time-building/01.jpg', '/work/time-building/02.jpg', '/work/time-building/03.jpg'] },

  { id: 'golf-clubhouse', title: 'Golf Clubhouse', discipline: 'models', year: 2025,
    role: 'Rhino · Unreal', location: '—', tags: ['rhino', 'unreal', 'clubhouse'],
    summary: 'A clubhouse organised around a continuous ribbon form, studied through material renders.',
    featured: false, external: null,
    cover: '/work/golf-clubhouse/cover.jpg',
    gallery: ['/work/golf-clubhouse/01.jpg', '/work/golf-clubhouse/02.jpg', '/work/golf-clubhouse/03.jpg'] },

  // ---------------- GRAPHIC ----------------
  { id: 'pi-day-poster', title: 'Pi Day Poster', discipline: 'graphic', year: 2025,
    role: 'Poster · Math Circle', location: '—', tags: ['poster', 'swiss', 'type'],
    summary: 'A Swiss-grid poster for Pi Day — the digits of π stacked against pink “pies”.',
    featured: true, external: null,
    cover: '/work/pi-day-poster/cover.png', gallery: [] },

  { id: 'one-percent-better', title: '1% Better Every Day', discipline: 'graphic', year: 2025,
    role: 'Personal · Poster', location: '—', tags: ['poster', 'colour-block', 'type'],
    summary: 'A colour-block typographic poster — a personal mantra set in heavy grotesk.',
    featured: false, external: null,
    cover: '/work/one-percent-better/cover.jpg',
    gallery: ['/work/one-percent-better/01.jpg'] },

  { id: 'gill-lab-door', title: 'Gill Lab Door', discipline: 'graphic', year: 2025,
    role: 'Environmental graphic', location: '—', tags: ['environmental', 'pattern'],
    summary: 'A door-sized graphic for a science prep room — lab glassware as a riotous pattern.',
    featured: false, external: null,
    cover: '/work/gill-lab-door/cover.jpg', gallery: [] },

  { id: 'portfolio-layout', title: 'Portfolio / Editorial', discipline: 'graphic', year: 2025,
    role: 'Editorial · InDesign', location: '—', tags: ['editorial', 'layout', 'indesign'],
    summary: 'The editorial system behind the print portfolio — strict grid, two type sizes.',
    featured: false, external: null,
    cover: '/work/portfolio-layout/cover.jpg', gallery: [] },

  // ---------------- OBJECTS (game & object design) ----------------
  { id: 'who-stole-my-shaomai', title: 'Who Stole My Shaomai?', discipline: 'objects', year: 2025,
    role: 'Game & identity design', location: '—', tags: ['game', 'illustration', 'identity', 'print'],
    summary: '谁偷了我的烧麦 — a board game set on Qianmen Street: board, cards, map, patterns, and a black-and-blue character cast.',
    featured: true, external: null,
    cover: '/work/who-stole-my-shaomai/cover.png',
    gallery: ['/work/who-stole-my-shaomai/01.png', '/work/who-stole-my-shaomai/02.png', '/work/who-stole-my-shaomai/03.png', '/work/who-stole-my-shaomai/04.png', '/work/who-stole-my-shaomai/05.png'] },

  // ---------------- WEB ----------------
  { id: 'read-this-building', title: 'Read This Building', discipline: 'web', year: 2026,
    role: 'AI · vision · web', location: '—', tags: ['ai', 'gemini', 'vision', 'critical'],
    summary: 'An AI that reads a building from a photo — style, elements, culture — then flags its own blind spots. A study in what AI sees, and misses, in architecture.',
    featured: true, external: null, app: '/read.html', cover: '/work/read-this-building/cover.jpg', gallery: [] },

  // Duyichu = a SEPARATE, in-progress project — featured here as web work and
  // linked out. Replace `external` with the deployed URL once it ships, and drop
  // a screenshot at public/work/duyichu-3d/cover.jpg.
  // Duyichu is a SEPARATE, in-progress project. Until it deploys, keep it as an
  // internal entry (no dead external link). When it ships: set `external` to the
  // live URL and drop a screenshot at public/work/duyichu-3d/cover.jpg.
  { id: 'duyichu-3d', title: 'Duyichu — Heritage Site', discipline: 'web', year: 2026,
    role: 'WebGL · Three.js · GSAP', location: 'Solo build', tags: ['webgl', '3d', 'gsap', 'vite'],
    summary: 'An interactive 3D heritage site for Duyichu, a 1738 Beijing institution. Live site coming soon.',
    featured: true, external: null, cover: null, gallery: [] },
];

/* ---- derived helpers ---- */
export const byDiscipline = (slug) => PROJECTS.filter((p) => p.discipline === slug);
export const featured = () => PROJECTS.filter((p) => p.featured);
export const countFor = (slug) => byDiscipline(slug).length;
export const disciplineFor = (slug) => DISCIPLINES.find((d) => d.slug === slug);
export const labelFor = (slug) => disciplineFor(slug)?.label ?? slug;
