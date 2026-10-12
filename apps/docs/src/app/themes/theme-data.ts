import type { ThemeVars } from '@ndop/schema/theme';

/**
 * One theme in the gallery (ADR-0023), from the built registry's
 * `registry:theme` items.
 */
export interface ThemeSummary {
  /** Registry item name, such as `default`. */
  name: string;
  /** Display name. */
  title: string;
  /** One sentence. */
  description: string;
  /** Who made it, or whose palette it adapts. */
  author?: string;
  /** Current version. */
  version: string;
  /** The command that installs it. */
  command: string;
  /** Its token values, as the item's `cssVars`. */
  vars: ThemeVars;
}
