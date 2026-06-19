/* ============================================================
   axis.js — DATA for "The Living Central Axis".
   Formal schema: each monument separates identity / archetype /
   spatial / historical / interpretive / rendering so that NO
   interpretation logic leaks into rendering logic.
     pos:  0 = south (Yongdingmen) … 1 = north (Bell Tower)
     side: 'center' | 'east' | 'west'
   Inscription facts are cited (see SOURCES); per-site dates are
   indicative.
   ============================================================ */

export const UNESCO = {
  name: 'Beijing Central Axis: A Building Ensemble Exhibiting the Ideal Order of the Chinese Capital',
  zh: '北京中轴线',
  inscribed: '27 July 2024',
  session: '46th session of the World Heritage Committee, New Delhi',
  criteria: '(iii), (iv)',
  reference: 'No. 1714 · China’s 59th World Heritage Site',
  area: '589 ha core · 4,542 ha buffer',
  components: 15,
  lengthKm: 7.8,
  south: 'Yongdingmen 永定门',
  north: 'Bell & Drum Towers 钟鼓楼',
};

/** @typedef {'gate'|'tower'|'palace'|'temple'|'altar'|'bridge'|'hill'|'square'|'road'} Archetype */

export const MONUMENTS = [
  { id: 'yongdingmen', archetype: 'gate',
    identity: { en: 'Yongdingmen', zh: '永定门' },
    spatial: { pos: 0.00, side: 'center', scale: 2.4 },
    historical: { year: 1553, era: 'Ming · rebuilt 2004' },
    interpretive: { pairing: null, role: 'The axis’s southern gate to the outer city — demolished in 1957 and reconstructed in 2004, restoring the line’s starting point.' },
    rendering: { intensity: 0.7, variant: 1 } },

  { id: 'xiannongtan', archetype: 'altar',
    identity: { en: 'Altar of Agriculture', zh: '先农坛' },
    spatial: { pos: 0.083, side: 'west', scale: 2.6 },
    historical: { year: 1420, era: 'Ming' },
    interpretive: { pairing: null, role: 'Where the emperor ploughed a ceremonial furrow each spring — the western half of the axis’s southern ritual pair.' },
    rendering: { intensity: 0.6, variant: 2 } },

  { id: 'tiantan', archetype: 'temple',
    identity: { en: 'Temple of Heaven', zh: '天坛' },
    spatial: { pos: 0.083, side: 'east', scale: 4.0 },
    historical: { year: 1420, era: 'Ming' },
    interpretive: { pairing: null, role: 'The great altar to Heaven — the eastern counterweight that balances the Altar of Agriculture across the line.' },
    rendering: { intensity: 0.9, variant: 1 } },

  { id: 'zhengyangmen', archetype: 'gate',
    identity: { en: 'Zhengyangmen & Arrow Tower', zh: '正阳门 · 箭楼' },
    spatial: { pos: 0.34, side: 'center', scale: 3.0 },
    historical: { year: 1439, era: 'Ming' },
    interpretive: { pairing: null, role: 'The grandest of the inner-city gates — the threshold between the commoners’ city and the imperial precinct.' },
    rendering: { intensity: 0.8, variant: 2 } },

  { id: 'south-road', archetype: 'road',
    identity: { en: 'Southern Section Road Remains', zh: '中轴线南段道路遗存' },
    spatial: { pos: 0.40, side: 'center', scale: 1.4 },
    historical: { year: 1420, era: 'Ming layers' },
    interpretive: { pairing: null, role: 'Excavated paving of the imperial way — physical proof of the axis as a built road, not just an idea.' },
    rendering: { intensity: 0.4, variant: 1 } },

  { id: 'tiananmen-square', archetype: 'square',
    identity: { en: 'Tian’anmen Square Ensemble', zh: '天安门广场及建筑群' },
    spatial: { pos: 0.47, side: 'center', scale: 4.4 },
    historical: { year: 1958, era: 'Modern' },
    interpretive: { pairing: null, role: 'The 20th-century civic heart — the Monument to the People’s Heroes, the Great Hall of the People, the National Museum, and Mao’s Memorial Hall, laid out on the line.' },
    rendering: { intensity: 0.85, variant: 1 } },

  { id: 'tiananmen', archetype: 'gate',
    identity: { en: 'Tian’anmen', zh: '天安门' },
    spatial: { pos: 0.52, side: 'center', scale: 3.2 },
    historical: { year: 1420, era: 'Ming · rebuilt 1651' },
    interpretive: { pairing: null, role: 'The “Gate of Heavenly Peace” — the ceremonial front of the imperial city.' },
    rendering: { intensity: 0.9, variant: 3 } },

  { id: 'jinshui', archetype: 'bridge',
    identity: { en: 'Outer Jinshui Bridges', zh: '外金水桥' },
    spatial: { pos: 0.54, side: 'center', scale: 1.6 },
    historical: { year: 1420, era: 'Ming' },
    interpretive: { pairing: null, role: 'Seven marble bridges over the Golden Water, fanned across the line before Tian’anmen.' },
    rendering: { intensity: 0.5, variant: 1 } },

  { id: 'duanmen', archetype: 'gate',
    identity: { en: 'Duanmen', zh: '端门' },
    spatial: { pos: 0.56, side: 'center', scale: 2.6 },
    historical: { year: 1420, era: 'Ming' },
    interpretive: { pairing: null, role: 'The “Upright Gate” — the last threshold before the palace itself.' },
    rendering: { intensity: 0.7, variant: 2 } },

  { id: 'forbidden-city', archetype: 'palace',
    identity: { en: 'The Forbidden City', zh: '故宫' },
    spatial: { pos: 0.62, side: 'center', scale: 5.0 },
    historical: { year: 1420, era: 'Ming 1406–1420' },
    interpretive: { pairing: null, role: 'The pivot of the whole composition — the imperial palace, the still point the entire axis is built to frame.' },
    rendering: { intensity: 1.0, variant: 1 } },

  { id: 'taimiao', archetype: 'temple',
    identity: { en: 'Imperial Ancestral Temple', zh: '太庙' },
    spatial: { pos: 0.66, side: 'east', scale: 3.0 },
    historical: { year: 1420, era: 'Ming' },
    interpretive: { pairing: 'ancestor', role: '“Ancestral temple on the left” (左祖) — where emperors honoured their forebears, east of the palace.' },
    rendering: { intensity: 0.75, variant: 2 } },

  { id: 'shejitan', archetype: 'altar',
    identity: { en: 'Altar of Land & Grain', zh: '社稷坛' },
    spatial: { pos: 0.66, side: 'west', scale: 3.0 },
    historical: { year: 1420, era: 'Ming' },
    interpretive: { pairing: 'deity', role: '“Altar of soil on the right” (右社) — the cosmic mirror of the ancestral temple, west of the palace.' },
    rendering: { intensity: 0.75, variant: 1 } },

  { id: 'jingshan', archetype: 'hill',
    identity: { en: 'Jingshan', zh: '景山' },
    spatial: { pos: 0.72, side: 'center', scale: 3.6 },
    historical: { year: 1420, era: 'Ming' },
    interpretive: { pairing: null, role: 'An artificial hill raised from moat earth — the axis’s highpoint and the city’s guardian “back wall” of feng-shui.' },
    rendering: { intensity: 0.8, variant: 1 } },

  { id: 'wanning', archetype: 'bridge',
    identity: { en: 'Wanning Bridge', zh: '万宁桥' },
    spatial: { pos: 0.86, side: 'center', scale: 1.6 },
    historical: { year: 1285, era: 'Yuan' },
    interpretive: { pairing: null, role: 'The oldest surviving point on the line — a Yuan-dynasty bridge that fixes the axis to the 13th-century city.' },
    rendering: { intensity: 0.55, variant: 2 } },

  { id: 'bell-drum', archetype: 'tower',
    identity: { en: 'Drum Tower & Bell Tower', zh: '鼓楼 · 钟楼' },
    spatial: { pos: 1.00, side: 'center', scale: 3.8 },
    historical: { year: 1272, era: 'Yuan · rebuilt Ming/Qing' },
    interpretive: { pairing: null, role: 'The northern terminus — the city’s timekeepers, “market behind the court,” closing the line with sound.' },
    rendering: { intensity: 0.9, variant: 1 } },
];

export const TIMELINE = [
  { year: '1267', label: 'Yuan Dadu', text: 'Kublai Khan founds Dadu; its planners set a single north–south spine — the axis is born.' },
  { year: '1285', label: 'Wanning Bridge', text: 'The Yuan bridge is built — still the oldest standing point on the line.' },
  { year: '1406–20', label: 'Ming rebuild', text: 'The Yongle Emperor rebuilds the capital: the Forbidden City, Jingshan, the temples and altars are set on the axis.' },
  { year: '1553', label: 'Outer city', text: 'The Ming outer-city wall extends the axis south to Yongdingmen — growing the line from ~3.8 km to its full 7.8 km.' },
  { year: '1644–1911', label: 'Qing', text: 'The Qing inherit and maintain the axis with little change to its order.' },
  { year: '1957', label: 'Loss', text: 'Yongdingmen is demolished as the city modernises — the line loses its southern gate.' },
  { year: '1958', label: 'New centre', text: 'Tian’anmen Square is remade at monumental scale; the Monument to the People’s Heroes rises on the line.' },
  { year: '2004', label: 'Restored', text: 'Yongdingmen is reconstructed, re-anchoring the axis’s southern end.' },
  { year: '2024', label: 'World Heritage', text: 'On 27 July, UNESCO inscribes the Beijing Central Axis — 15 components, one ordering line.' },
];

export const COSMOLOGY = [
  { zh: '择中', en: 'Centrality', text: 'The ruler sits at the centre. The axis makes that idea physical — the palace is the still point the whole city is measured from.' },
  { zh: '对称', en: 'Symmetry', text: 'Everything mirrors across the line: gate answers gate, altar answers altar, east balances west.' },
  { zh: '左祖右社', en: 'Temple left, altar right', text: 'Ancestors to the east (Taimiao), soil and grain to the west (Shejitan) — the state’s two duties, flanking the throne.' },
  { zh: '前朝后市', en: 'Court front, market behind', text: 'Governance to the south, daily life and the time-keeping towers to the north — the Kaogongji’s ideal capital, drawn at 1:1.' },
];

export const SOURCES = [
  { title: 'UNESCO World Heritage List — Beijing Central Axis (No. 1714)', url: 'https://whc.unesco.org/en/list/1714/' },
  { title: 'Beijing Municipal Government — official inscription announcement', url: 'https://english.beijing.gov.cn/latest/news/202407/t20240727_3760807.html' },
  { title: 'The UNESCO Courier — “China: the return of Yongdingmen Gate”', url: 'https://courier.unesco.org/en/articles/china-return-yongdingmen-gate' },
  { title: 'Xinhua — Beijing Central Axis inscribed on the World Heritage List', url: 'https://english.news.cn/20240727/b0dfd72ff34a4f5bba2267f74a950bb5/c.html' },
  { title: 'CGTN — Beijing Central Axis named a UNESCO World Heritage site', url: 'https://news.cgtn.com/news/2024-07-27/Beijing-Central-Axis-named-a-new-UNESCO-World-Heritage-site-1vzLf6Tnd3q/p.html' },
  { title: 'Wikipedia — Beijing Central Axis (overview & component list)', url: 'https://en.wikipedia.org/wiki/Beijing_Central_Axis' },
];

/* ---- derived helpers ---- */
export const monumentById = (id) => MONUMENTS.find((m) => m.id === id);
export const SEGMENT_COUNT = MONUMENTS.length;
