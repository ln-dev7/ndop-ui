import { type EnvironmentProviders } from '@angular/core';
import {
  LucideBold,
  LucideBookmark,
  LucideCheck,
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsUpDown,
  LucideChevronUp,
  LucideCircleAlert,
  LucideCircle,
  LucideCircleCheck,
  LucideEllipsis,
  LucideFolderOpen,
  LucideGripVertical,
  LucideInfo,
  LucideItalic,
  LucideLoaderCircle,
  LucideMinus,
  LucideOctagonX,
  LucidePlus,
  LucideSearch,
  LucideTextAlignCenter,
  LucideTextAlignEnd,
  LucideTextAlignStart,
  LucideTriangleAlert,
  LucideUnderline,
  LucideX,
} from '@lucide/angular';
import { provideNdopIcons, type NdIcons } from '@ndop/core';

/**
 * Icons styled items ask for by semantic name, drawn with Lucide
 * (ADR-0013). Add an entry when you install an item that needs a new name;
 * to switch icon libraries, change the values here.
 */
export const ndopIcons = {
  bold: LucideBold.icon,
  bookmark: LucideBookmark.icon,
  check: LucideCheck.icon,
  'chevron-down': LucideChevronDown.icon,
  'chevron-left': LucideChevronLeft.icon,
  'chevron-right': LucideChevronRight.icon,
  'chevron-up': LucideChevronUp.icon,
  'chevrons-up-down': LucideChevronsUpDown.icon,
  circle: LucideCircle.icon,
  'circle-alert': LucideCircleAlert.icon,
  'circle-check': LucideCircleCheck.icon,
  ellipsis: LucideEllipsis.icon,
  'folder-open': LucideFolderOpen.icon,
  'grip-vertical': LucideGripVertical.icon,
  info: LucideInfo.icon,
  italic: LucideItalic.icon,
  'loader-circle': LucideLoaderCircle.icon,
  minus: LucideMinus.icon,
  'octagon-x': LucideOctagonX.icon,
  plus: LucidePlus.icon,
  search: LucideSearch.icon,
  'text-align-center': LucideTextAlignCenter.icon,
  'text-align-end': LucideTextAlignEnd.icon,
  'text-align-start': LucideTextAlignStart.icon,
  'triangle-alert': LucideTriangleAlert.icon,
  underline: LucideUnderline.icon,
  x: LucideX.icon,
} satisfies NdIcons;

/**
 * Registers {@link ndopIcons}. `ndop init` adds it to the providers in
 * `app.config.ts`.
 *
 * @returns Providers for `ApplicationConfig`.
 *
 * @example
 * ```ts
 * providers: [provideNdop(), provideIcons()];
 * ```
 */
export function provideIcons(): EnvironmentProviders {
  return provideNdopIcons(ndopIcons);
}
