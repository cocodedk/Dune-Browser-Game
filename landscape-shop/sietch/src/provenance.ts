// landscape-shop/sietch/src/provenance.ts
// Where each number in spec.ts came from, so a later round can re-derive
// rather than guess. Mirrors the other shops' provenance.ts.

export const PROVENANCE = {
  footprint: 'AUTHORED: communal cavern proportions from the 2021/24 ' +
    'Villeneuve sietch interiors (Sietch Tabr: wide low-vaulted halls ' +
    'carved in warm rock), sized so the hall fills the CAMERA_RIG frame ' +
    'with rock on all four edges — no set edge ever visible. Composition ' +
    'mood only: the Cryo 1992 sietch rooms (hearth-lit, inhabited).',
  cameraRig: 'AUTHORED against the consumer: LocationMode replaces a ' +
    'painted 2.5D diorama (paintDiorama.ts), so the rig stands where the ' +
    'painting\'s implied viewpoint was — just inside the mouth, eye ' +
    'height 2.4 m, looking into the depth. FOV 50 matches the game\'s ' +
    'shared perspective camera (Renderer.ts). The existing parallax ' +
    'drift becomes camera motion in the adapter; the set is static.',
  dressing: 'AUTHORED: hearth glow color 0xffb05c is the exact hearth ' +
    'tone the painted diorama uses today (paintDiorama.ts hearth ' +
    'gradient rgba(255,176,92)) — continuity between the painting the ' +
    'player knew and the set that replaces it. Water discipline: the ' +
    'basin is small, contained, precious — never a pond.',
  palette: 'AUTHORED from locationDefs.ts sietch entry (massing #2b1c10, ' +
    'sky #3a2414) lifted toward firelight so a lit 3D room does not go ' +
    'muddier than the painting it replaces.',
  sourcedAssets: 'USED (R3 dressing bake): fire_brazier, amphora, ' +
    'basket_set, spice_sacks, carpet_roll, water_urn_trough, date_palm, ' +
    'doum_palm, desert_scrub, sandstone_boulder, tomb_entrance - all ' +
    'Desert Kingdom pack, threejsassets.com/assets/<name-with-dashes>, ' +
    'Lifetime Commercial License v1 (purchased 2026-08-09). Raw GLBs ' +
    'live gitignored (landscape-shop/feedstock-packs/) and are never ' +
    'committed; the license forbids redistributing raw files. What ' +
    'ships is src/model/dressingBake.json: 23 reshaped derivatives ' +
    '(plates stripped, cropped, true-meter scaled, decimated, re-seated, ' +
    're-tinted to PALETTE via tools/bake/tones.mjs - no feedstock color ' +
    'survives), byte-deterministic from tools/bakeDressing.mjs for pack ' +
    'owners. royal_palm was skipped (Draco-compressed; a temp decompress ' +
    'step would break repo-only reproducibility) in favor of doum_palm.',
  figures: 'USED (figures pass, user-authorized one-case CC0 exception ' +
    'to the threejsassets-only rule): "Wizard" by Polygonal Mind ' +
    '(poly.pizza/m/6kY9VaAfPv) and "Evil Wizard" by AliceCassie ' +
    '(poly.pizza/m/bdxawstqtq), both CC0 1.0 public domain (verified ' +
    '2026-08-10), both non-rigged static meshes. Reshaped into three ' +
    'sietch derivatives - hearthElder and basinTender (first source, ' +
    'different scale/placement), tierSentinel (second source, crown ' +
    'cropped) - reference-pose limbs geometrically stripped, decimated ' +
    'to 381-539 tris, re-tinted entirely to PALETTE robe/skin ramps. ' +
    'The dressing bake carries per-piece sourceUrl/licence fields as ' +
    'its own attribution record.',
} as const
