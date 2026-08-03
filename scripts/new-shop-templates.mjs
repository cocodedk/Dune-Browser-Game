// scripts/new-shop-templates.mjs
// Doc and entry-point templates for `npm run shop:new`. Code templates
// (contracts.ts, spec.ts, etc.) live in ./new-shop-templates-src.mjs — split
// so both files stay under the 200-line cap.

export function renderIndexHtml(name, Name) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${Name} — vehicle shop</title>
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

export function renderReadme(name, Name) {
  return `# ${Name} — vehicle shop

Scaffolded by \`npm run shop:new -- ${name}\`. Build and gauntlet-test
${name} here, separately from the game and from every other shop, in
three.js — see \`docs/PRD/dune92/04-asset-pipeline.md\` for the pipeline
this shop is part of.

## Public surface

The game may import only \`src/model/**\`, \`src/contracts.ts\` and
\`src/spec.ts\`, and only via the \`@shop\` alias — never a bare path into
this directory. ESLint enforces the fence (see \`eslint.config.js\`);
\`src/game-render/machines/Harvester.ts\` is the reference release adapter.
Everything else here (\`main.ts\`, the dev harness, test-only helpers) is
harness, free to churn.

## Run it

\`\`\`bash
npm run shop:${name}          # dev server for the test area
npm run shop:${name}:check    # type-check (tsc -p vehicle-shop/${name})
npm run shop:${name}:build    # production build of the shop alone
\`\`\`

## Verifying

\`\`\`bash
npm run lint                     # from the repo root
npm run shop:${name}:check
npx vitest run vehicle-shop/${name}
bash scripts/check-file-length.sh
\`\`\`

The 200-line cap applies to every source-like file here (see CODEX.md).
Markdown is exempt.

## Where the work is tracked

[\`progress.md\`](./progress.md) holds the bar and the round log.
`
}

export function renderProgress(name, Name) {
  return `# ${Name} Gauntlet Loop — the bar, and the live log

Standalone rig at \`vehicle-shop/${name}/\`. Run it with \`npm run shop:${name}\`.

## STATUS

Scaffolded, not yet built. No rounds landed.

## The bar

Define the quality bar here before the first round: what "looks right" and
"acts right" mean for this asset. Mirror the harvester/ornithopter shops'
structure (reads as the thing; blind identification; acts like the thing;
correctness of the numbers) once there is a reference to judge against.

## Rounds

_None yet._
`
}
