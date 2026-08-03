import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'vehicle-shop/**/dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  // Workshop -> game release fence: see docs/PRD/dune92/04-asset-pipeline.md
  // (doc lands later this branch). Game code may only reach into a shop
  // through the @shop alias and only its public surface (model/, contracts,
  // spec); shops may not reach into the game or into each other at all.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/vehicle-shop/**'],
          message: 'Import shop code via the @shop alias, never by path.' },
        // gitignore semantics (the `ignore` package) can't re-include a path whose ancestor
        // is still matched, so each ancestor is negated; bare specifiers like '@shop/harvester' resolve to nothing anyway.
        { group: ['@shop/**',
            '!@shop/*', '!@shop/*/src',
            '!@shop/*/src/model', '!@shop/*/src/model/**',
            '!@shop/*/src/contracts', '!@shop/*/src/spec'],
          message: 'Only the shop public surface (model/**, contracts, spec) is released to the game.' },
      ] }],
    },
  },
  {
    files: ['vehicle-shop/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/src/game-engine/**', '**/src/game-render/**', '**/src/ui/**',
            '**/src/EventBus*', '@shop/**'],
          message: 'Shops are standalone: no imports from game src or other shops.' },
      ] }],
    },
  }
)
