import * as templateParser from '@angular-eslint/template-parser';
import * as tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';

/**
 * A rule tester for templates, through angular-eslint's template parser.
 *
 * @returns The tester.
 */
export function templateTester(): RuleTester {
  return new RuleTester({
    languageOptions: { parser: templateParser },
  });
}

/**
 * A rule tester for TypeScript.
 *
 * @returns The tester.
 */
export function typescriptTester(): RuleTester {
  return new RuleTester({
    languageOptions: { parser: tsParser },
  });
}
