import type { TSESLint } from '@typescript-eslint/utils';
import { dialogTitle } from './rules/dialog-title';
import { formControlLabel } from './rules/form-control-label';
import { iconButtonName } from './rules/icon-button-name';
import { logicalProperties } from './rules/logical-properties';
import { noPrivatePrimitives } from './rules/no-private-primitives';
import { noRawColors } from './rules/no-raw-colors';

/**
 * `@ndop/eslint-plugin`: rules for Angular apps that use Ndop UI
 * (ADR-0018), for templates and TypeScript.
 *
 * - `icon-button-name`, `dialog-title` and `form-control-label` check
 *   templates for accessible names.
 * - `logical-properties` and `no-raw-colors` check class lists in templates
 *   and in `cn()`, `variants()` and `host` classes.
 * - `no-private-primitives` checks imports.
 *
 * Template rules need angular-eslint's template parser, and its inline
 * template processor for components' `template`s.
 *
 * @example
 * ```js
 * // eslint.config.mjs
 * import ndop from '@ndop/eslint-plugin';
 * export default [...angular.configs.tsRecommended, ...ndop.configs.recommended];
 * ```
 *
 * @packageDocumentation
 */

/** Every rule, by name. */
export const rules = {
  'dialog-title': dialogTitle,
  'form-control-label': formControlLabel,
  'icon-button-name': iconButtonName,
  'logical-properties': logicalProperties,
  'no-private-primitives': noPrivatePrimitives,
  'no-raw-colors': noRawColors,
};

/** The plugin, as flat config takes it. */
const plugin = {
  meta: { name: '@ndop/eslint-plugin' },
  rules,
  configs: {} as Record<string, TSESLint.FlatConfig.ConfigArray>,
};

plugin.configs['recommended'] = [
  {
    name: 'ndop/recommended/typescript',
    files: ['**/*.ts'],
    plugins: { ndop: plugin as unknown as TSESLint.FlatConfig.Plugin },
    rules: {
      'ndop/logical-properties': 'error',
      'ndop/no-private-primitives': 'error',
      'ndop/no-raw-colors': 'error',
    },
  },
  {
    name: 'ndop/recommended/template',
    files: ['**/*.html'],
    plugins: { ndop: plugin as unknown as TSESLint.FlatConfig.Plugin },
    rules: {
      'ndop/dialog-title': 'error',
      'ndop/form-control-label': 'error',
      'ndop/icon-button-name': 'error',
      'ndop/logical-properties': 'error',
      'ndop/no-raw-colors': 'error',
    },
  },
];

export default plugin;
