import * as picocolors from 'picocolors';

/**
 * Terminal colors. picocolors is CommonJS with a computed
 * `module.exports`, so the CLI's ESM bundle sees it only as a default
 * export, while the workspace executor, loaded as CommonJS without
 * `esModuleInterop`, sees its members directly; this works in both.
 */
export const pc: typeof picocolors =
  (picocolors as { default?: typeof picocolors }).default ?? picocolors;
