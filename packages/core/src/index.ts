/**
 * `@ndop/core`: utilities shared by Ndop styled items (`cn()`,
 * `variants()`, `NdIcon`) and app configuration (`provideNdop()`, `NdopTheme`). The
 * token mechanics CSS ships as `@ndop/core/styles.css` (ADR-0006).
 *
 * @packageDocumentation
 */
export { cn, type ClassValue } from './lib/cn';
export {
  ND_ICONS,
  NdIcon,
  provideNdopIcons,
  type NdIconData,
  type NdIconNode,
  type NdIcons,
} from './lib/icon';
export {
  ND_CONFIG,
  NdopTheme,
  provideNdop,
  type NdopConfig,
  type NdopThemeMode,
} from './lib/theme';
export {
  variants,
  type VariantDefinitions,
  type VariantOf,
  type VariantSelection,
  type VariantsConfig,
  type VariantsFunction,
  type VariantValue,
} from './lib/variants';
