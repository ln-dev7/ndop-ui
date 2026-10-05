import nx from '@nx/eslint-plugin';
import { createJiti } from 'jiti';
import baseConfig from '../eslint.config.mjs';

// The registry lints with Ndop's own rules (ADR-0018), loaded from source so
// rule changes apply without a build.
const ndop = await createJiti(import.meta.url).import(
  '../packages/eslint-plugin/src/index.ts',
  { default: true },
);

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  ...ndop.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'nd',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          // Examples are components users copy into their apps.
          prefix: ['nd', 'example'],
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
