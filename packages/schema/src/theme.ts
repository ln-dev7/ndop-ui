/**
 * `@ndop/schema/theme`: what Ndop's theme tooling shares (ADR-0023). OKLCH
 * colors and WCAG contrast, the theme tokens and the pairs a theme must
 * keep readable, theme URLs, and the CSS, registry item and Design Tokens
 * exports. It has no dependencies, so the browser, the CLI and the theme
 * URL function all use it.
 *
 * @packageDocumentation
 */
export {
  contrastRatio,
  formatOklch,
  parseColor,
  toHex,
  type Oklch,
} from './lib/theme/color';
export {
  themeCss,
  themeItem,
  themePackages,
  themeTokens,
  type ThemeItemOptions,
} from './lib/theme/export';
export {
  CUSTOM_THEME_PATH,
  customThemeResponse,
  type ThemeUrlResponse,
} from './lib/theme/theme-response';
export { decodeTheme, encodeTheme } from './lib/theme/theme-url';
export {
  COLOR_TOKENS,
  CONTRAST_PAIRS,
  fontOf,
  fontStack,
  THEME_FONTS,
  themeContrast,
  type ColorToken,
  type ContrastPair,
  type ContrastResult,
  type ThemeFont,
  type ThemeVars,
} from './lib/theme/tokens';
