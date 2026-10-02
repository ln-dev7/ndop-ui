import nx from '@nx/eslint-plugin';
import jsdoc from 'eslint-plugin-jsdoc';
import tsdoc from 'eslint-plugin-tsdoc';

/**
 * External packages primitive source may import. @angular/forms lets
 * primitives read forms state and, where they own their value, implement
 * Signal Forms and ControlValueAccessor (ADR-0004, amendment 1).
 */
const primitiveRuntimeImports = [
  '@angular/core',
  '@angular/core/*',
  '@angular/aria',
  '@angular/aria/*',
  '@angular/cdk',
  '@angular/cdk/*',
  '@angular/forms',
  '@angular/forms/*',
  'tslib',
];

/**
 * Encodes RFC-0001 "Dependency rules": behavior never depends on styling,
 * and tooling reads the registry only as built JSON.
 *
 * @param {string[]} primitiveImports - External imports allowed in
 *   primitives.
 */
const dependencyRules = (primitiveImports) => [
  'error',
  {
    enforceBuildableLibDependency: true,
    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
    depConstraints: [
      {
        sourceTag: 'type:primitives',
        onlyDependOnLibsWithTags: [],
        allowedExternalImports: primitiveImports,
      },
      {
        sourceTag: 'type:core',
        onlyDependOnLibsWithTags: [],
      },
      {
        sourceTag: 'type:registry',
        onlyDependOnLibsWithTags: [
          'type:primitives',
          'type:core',
          'type:registry',
        ],
      },
      {
        sourceTag: 'type:schema',
        onlyDependOnLibsWithTags: [],
      },
      {
        sourceTag: 'type:tooling',
        onlyDependOnLibsWithTags: ['type:schema', 'type:tooling'],
      },
      {
        sourceTag: 'type:tool',
        onlyDependOnLibsWithTags: ['type:schema', 'type:tooling', 'type:tool'],
      },
      {
        sourceTag: 'type:app',
        onlyDependOnLibsWithTags: [
          'type:primitives',
          'type:core',
          'type:schema',
        ],
      },
      {
        // e2e suites read spec.md contracts through @ndop/metadata.
        sourceTag: 'type:e2e',
        onlyDependOnLibsWithTags: ['type:tooling'],
      },
    ],
  },
];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vitest.config.*.timestamp*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': dependencyRules(primitiveRuntimeImports),
    },
  },
  {
    // Tests may use test tooling; the runtime limits above still hold for
    // the code they exercise.
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@nx/enforce-module-boundaries': dependencyRules([
        ...primitiveRuntimeImports,
        '@testing-library/*',
        'vitest',
      ]),
    },
  },
  {
    // RFC-0001 "Code documentation rules": every export carries TSDoc,
    // because the metadata extractor turns it into docs, MCP answers and
    // llms.txt. Tests, configs and e2e specs are not public API.
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.config.ts',
      '**/*.config.mts',
      '**/test-setup.ts',
      '**/vite-env.d.ts',
      'apps/docs-e2e/**',
    ],
    plugins: { jsdoc, tsdoc },
    rules: {
      ...jsdoc.configs['flat/recommended-tsdoc-error'].rules,
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
          },
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration',
            'ExportNamedDeclaration > VariableDeclaration',
          ],
        },
      ],
      'jsdoc/require-description': 'error',
      // TSDoc convention: one blank line between the description and tags.
      'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
      'tsdoc/syntax': 'error',
    },
  },
  {
    files: ['**/*.json'],
    rules: {},
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
