/* ============================================================
   journal.js — Field Notes.
   Short posts at the intersection of architecture, code, and
   culture. Add an entry to POSTS (newest first). `body` is HTML.
   NOTE: these are starter drafts — rewrite them in your own voice.
   ============================================================ */

export const POSTS = [
  {
    slug: 'cultural-interfaces',
    title: 'Cultural interfaces',
    date: '2026-06-15',
    tags: ['note'],
    excerpt: 'Why I keep building things that sit between architecture, code, and culture.',
    body: `
      <p>I keep noticing that my projects rhyme. A 3D heritage site for an old Beijing
      institution. A board game built on the streets around it. An analysis of the central
      axis as a piece of cosmology. They look like different disciplines, but they're the same
      move: take something cultural or spatial, and make it <em>legible</em> — explorable,
      playable, tweakable.</p>
      <p>I've started calling these <strong>cultural interfaces</strong>. The architecture is
      the subject; code and design are how I let someone else walk into it. Technology isn't the
      point — it's the doorway.</p>
      <p>This journal is where I'll think out loud about that: half-formed ideas, references,
      and notes on what I'm making and why.</p>
    `,
  },
  {
    slug: 'read-this-building',
    title: 'Read this building',
    date: '2026-06-15',
    tags: ['ai', 'project'],
    excerpt: 'An AI that reads architecture from a photo — and admits what it can’t see.',
    body: `
      <p>I built a small tool: show it a photo of a building and it reads it back to you —
      style, elements, materials, cultural context. The fluent part was easy. The interesting
      part is the <em>blind spots</em>.</p>
      <p>These models are trained mostly on Western, canonical, professionally-shot
      architecture. So when you hand them a hutong, or a vernacular shopfront, they tend to
      force it into borrowed categories — confidently. So every reading the tool produces ends
      by naming what it's guessing and where its training is likely bending the answer.</p>
      <h2>Why it matters</h2>
      <p>It's less a gadget than an argument: that "reading" a building is never neutral, and
      that the gaps in a machine's reading are a map of whose architecture it was taught to see.</p>
      <p><a href="/read.html">Try it →</a></p>
    `,
  },
  {
    slug: 'rules-as-a-knob',
    title: 'Rules as a knob',
    date: '2026-06-14',
    tags: ['generative', 'project'],
    excerpt: 'Turning 冰裂 ice-ray lattice into something you can tweak, shuffle, and export.',
    body: `
      <p>Traditional Chinese lattice — 冰裂 ice-ray, 回纹 key-fret, 龟背 tortoiseshell — looks
      ornamental, but it's really rule systems. Ice-ray is just: keep splitting a pane into
      irregular shards. Key-fret is a spiral, tiled. Tortoiseshell is a hexagon, tessellated.</p>
      <p>So I turned the rules into knobs. <strong>Pattern Loom</strong> lets you pick a motif,
      change its density and weight, shuffle a seed, and export a print-ready file. Every
      ice-ray seed is one of a kind.</p>
      <p>I like that it's a <em>tool</em>, not an artifact — the output is yours to make.</p>
      <p><a href="/loom.html">Open the loom →</a></p>
    `,
  },
];

export const postBySlug = (slug) => POSTS.find((p) => p.slug === slug);
