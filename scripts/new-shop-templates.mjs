// scripts/new-shop-templates.mjs
// Doc and entry-point templates for `npm run shop:new` (vehicle-shop/),
// `npm run cast:new` (character-shop/) and `npm run land:new`
// (landscape-shop/). Shared across all three roots through a small render
// context (name, Name, root, scriptPrefix, alias, kindLabel). Code
// templates are kind-specific: vehicle in ./new-shop-templates-src.mjs,
// character (HUMANOID) in ./new-shop-templates-cast.mjs and
// ./new-shop-templates-cast-model.mjs, landscape (STATIC SCENERY) in
// ./new-shop-templates-land.mjs and ./new-shop-templates-land-model.mjs —
// split so every file stays under the 200-line cap.

export function renderIndexHtml(ctx) {
  const { Name, kindLabel } = ctx
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${Name} — ${kindLabel} shop</title>
    <style>
      :root { color-scheme: dark; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body, #app { width: 100%; height: 100%; overflow: hidden; background: #0b0a09; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`
}

export function renderReadme(ctx) {
  const { name, Name, root, scriptPrefix, alias, kindLabel } = ctx
  const adapter = kindLabel === 'character'
    ? '`src/game-render/modes/conversation/drawFigure.ts` (and friends) is the release point — see `character-shop/docs/gauntlet-loop.md`.'
    : kindLabel === 'landscape'
    ? '`src/game-render/modes/location/LocationMode.ts` (sietch) or `src/game-render/modes/flight/FlightMode.ts` (cliff) is the release point, per the roster — see `landscape-shop/docs/gauntlet-loop.md`.'
    : '`src/game-render/machines/Harvester.ts` is the reference release adapter.'
  return `# ${Name} — ${kindLabel} shop

Scaffolded by \`npm run ${scriptPrefix}:new -- ${name}\`. Build and gauntlet-test
${name} here, separately from the game and from every other shop, in
three.js — see \`docs/PRD/dune92/04-asset-pipeline.md\` for the pipeline
this shop is part of.

## Public surface

The game may import only \`src/model/**\`, \`src/contracts.ts\` and
\`src/spec.ts\`, and only via the \`${alias}\` alias — never a bare path into
this directory. ESLint enforces the fence (see \`eslint.config.js\`);
${adapter}
Everything else here (\`main.ts\`, the dev harness, test-only helpers) is
harness, free to churn.

## Run it

\`\`\`bash
npm run ${scriptPrefix}:${name}          # dev server for the test area
npm run ${scriptPrefix}:${name}:check    # type-check (tsc -p ${root}/${name})
npm run ${scriptPrefix}:${name}:build    # production build of the shop alone
\`\`\`

## Verifying

\`\`\`bash
npm run lint                     # from the repo root
npm run ${scriptPrefix}:${name}:check
npx vitest run ${root}/${name}
bash scripts/check-file-length.sh
\`\`\`

The 200-line cap applies to every source-like file here (see CODEX.md).
Markdown is exempt.

## Where the work is tracked

[\`progress.md\`](./progress.md) holds the bar and the round log.
`
}

export function renderProgress(ctx) {
  const { name, Name, root, scriptPrefix, kindLabel } = ctx
  const mirror = kindLabel === 'character'
    ? "Mirror another character-shop build's structure and " +
      '`character-shop/docs/gauntlet-loop.md`\'s per-round bar (R0-R4: ' +
      'silhouette, likeness, costume, eyes/pose)'
    : kindLabel === 'landscape'
    ? "Mirror `landscape-shop/docs/gauntlet-loop.md`'s per-round bar " +
      '(R0 spec, R1 massing/silhouette, R2 surface/materials, R3 ' +
      'dressing + final panel, ≥8/10 zero correctness findings)'
    : "Mirror the harvester/ornithopter shops' structure (reads as the " +
      'thing; blind identification; acts like the thing; correctness of ' +
      'the numbers)'
  return `# ${Name} Gauntlet Loop — the bar, and the live log

Standalone rig at \`${root}/${name}/\`. Run it with \`npm run ${scriptPrefix}:${name}\`.

## STATUS

Scaffolded, not yet built. No rounds landed.

## The bar

Define the quality bar here before the first round: what "looks right" and
"acts right" mean for this asset. ${mirror}
once there is a reference to judge against.

## Rounds

_None yet._
`
}
