import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * Creates an Ndop rule, documented in the plugin's README.
 */
export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/ndop-ui/ui/blob/master/packages/eslint-plugin/README.md#${name}`,
);
