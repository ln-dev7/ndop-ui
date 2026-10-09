import { type EnvironmentProviders } from '@angular/core';
import {
  LucideBold,
  LucideBookmark,
  LucideCheck,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsUpDown,
  LucideCircleAlert,
  LucideCircle,
  LucideCircleCheck,
  LucideEllipsis,
  LucideFolderOpen,
  LucideItalic,
  LucideLoaderCircle,
  LucideMinus,
  LucideSearch,
  LucideTextAlignCenter,
  LucideTextAlignEnd,
  LucideTextAlignStart,
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
  'chevron-left': LucideChevronLeft.icon,
  'chevron-right': LucideChevronRight.icon,
  'chevrons-up-down': LucideChevronsUpDown.icon,
  circle: LucideCircle.icon,
  'circle-alert': LucideCircleAlert.icon,
  'circle-check': LucideCircleCheck.icon,
  ellipsis: LucideEllipsis.icon,
  'folder-open': LucideFolderOpen.icon,
  italic: LucideItalic.icon,
  'loader-circle': LucideLoaderCircle.icon,
  minus: LucideMinus.icon,
  search: LucideSearch.icon,
  'text-align-center': LucideTextAlignCenter.icon,
  'text-align-end': LucideTextAlignEnd.icon,
  'text-align-start': LucideTextAlignStart.icon,
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
