import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'vehicle-shop/**/dist/**', 'character-shop/**/dist/**', 'landscape-shop/**/dist/**'],
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
  // Workshop -> game release fence: see docs/PRD/dune92/04-asset-pipeline.md.
  // Game code may only reach into a shop through the @shop/@cast/@land alias
  // and only its public surface (model/, contracts, spec); shops may not
  // reach into the game, into a shop of another root, or into each other.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/vehicle-shop/**'],
          message: 'Import shop code via the @shop alias, never by path.' },
        { group: ['**/character-shop/**'],
          message: 'Import cast code via the @cast alias, never by path.' },
        { group: ['**/landscape-shop/**'],
          message: 'Import landscape code via the @land alias, never by path.' },
        // gitignore semantics (the `ignore` package) can't re-include a path whose ancestor
        // is still matched, so each ancestor is negated; bare specifiers like '@shop/harvester' resolve to nothing anyway.
        { group: ['@shop/**',
            '!@shop/*', '!@shop/*/src',
            '!@shop/*/src/model', '!@shop/*/src/model/**',
            '!@shop/*/src/contracts', '!@shop/*/src/spec'],
          message: 'Only the shop public surface (model/**, contracts, spec) is released to the game.' },
        { group: ['@cast/**',
            '!@cast/*', '!@cast/*/src',
            '!@cast/*/src/model', '!@cast/*/src/model/**',
            '!@cast/*/src/contracts', '!@cast/*/src/spec'],
          message: 'Only the cast public surface (model/**, contracts, spec) is released to the game.' },
        { group: ['@land/**',
            '!@land/*', '!@land/*/src',
            '!@land/*/src/model', '!@land/*/src/model/**',
            '!@land/*/src/contracts', '!@land/*/src/spec'],
          message: 'Only the landscape public surface (model/**, contracts, spec) is released to the game.' },
      ] }],
    },
  },
  {
    files: ['vehicle-shop/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/src/game-engine/**', '**/src/game-render/**', '**/src/ui/**',
            '**/src/EventBus*', '@shop/**',
            '**/character-shop/**', '@cast/**',
            '**/landscape-shop/**', '@land/**'],
          message: 'Shops are standalone: no imports from game src, the character-shop or landscape-shop roots, or other shops.' },
      ] }],
    },
  },
  {
    files: ['character-shop/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/src/game-engine/**', '**/src/game-render/**', '**/src/ui/**',
            '**/src/EventBus*', '**/vehicle-shop/**', '@shop/**', '@cast/**',
            '**/landscape-shop/**', '@land/**'],
          message: 'Characters are standalone: no imports from game src, the vehicle-shop or landscape-shop roots, or other characters.' },
      ] }],
    },
  },
  {
    files: ['landscape-shop/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/src/game-engine/**', '**/src/game-render/**', '**/src/ui/**',
            '**/src/EventBus*', '**/vehicle-shop/**', '@shop/**',
            '**/character-shop/**', '@cast/**', '@land/**'],
          message: 'Landscape sets are standalone: no imports from game src, the vehicle-shop or character-shop roots, or other landscape sets.' },
      ] }],
    },
  }
)
