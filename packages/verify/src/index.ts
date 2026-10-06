/**
 * `@ndop/verify`: the checks behind `ndop verify` and the MCP server's
 * `verify` and `validate_usage` tools (ADR-0018). It checks Angular code
 * that uses Ndop UI against component metadata, builds it through the
 * app's own build target, lints it with Ndop's rules, and renders it in
 * Chromium for axe and screenshots.
 *
 * @packageDocumentation
 */
export {
  buildHarness,
  buildProblems,
  harnessSource,
  VERIFY_DIR,
} from './lib/build';
export {
  findComponents,
  type FoundComponent,
  type TemplateSource,
} from './lib/components';
export { lintFiles, ndopLintConfig, type LintResult } from './lib/lint';
export { renderComponents, type RenderResult } from './lib/render';
export type {
  ComponentDoc,
  MetadataSource,
  Problem,
  StepName,
  StepResult,
  VerifyOptions,
  VerifyResult,
} from './lib/types';
export { checkUsage, distance } from './lib/usage';
export { verify } from './lib/verify';
export { findApp, projectTypescript, type AngularApp } from './lib/workspace';
