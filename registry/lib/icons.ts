import { type EnvironmentProviders } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsUpDown,
  LucideCircleAlert,
  LucideCircleCheck,
  LucideEllipsis,
  LucideFolderOpen,
  LucideLoaderCircle,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { provideNdopIcons, type NdIcons } from '@ndop/core';

/**
 * Icons styled items ask for by semantic name, drawn with Lucide
 * (ADR-0013). Add an entry when you install an item that needs a new name;
 * to switch icon libraries, change the values here.
 */
export const ndopIcons = {
  'chevron-left': LucideChevronLeft.icon,
  'chevron-right': LucideChevronRight.icon,
  'chevrons-up-down': LucideChevronsUpDown.icon,
  'circle-alert': LucideCircleAlert.icon,
  'circle-check': LucideCircleCheck.icon,
  ellipsis: LucideEllipsis.icon,
  'folder-open': LucideFolderOpen.icon,
  'loader-circle': LucideLoaderCircle.icon,
  search: LucideSearch.icon,
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
