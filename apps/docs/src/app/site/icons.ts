import type { EnvironmentProviders } from '@angular/core';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideLanguages,
  LucideMenu,
  LucideMonitor,
  LucideMoon,
  LucideSun,
} from '@lucide/angular';
import { provideNdopIcons } from '@ndop/core';
import { ndopIcons } from '@/lib/icons';

/**
 * Registers the icons the registry items use plus the ones the docs' own
 * chrome needs.
 *
 * @returns Providers for the application config.
 */
export function provideDocsIcons(): EnvironmentProviders {
  return provideNdopIcons({
    ...ndopIcons,
    'arrow-left': LucideArrowLeft.icon,
    'arrow-right': LucideArrowRight.icon,
    languages: LucideLanguages.icon,
    menu: LucideMenu.icon,
    monitor: LucideMonitor.icon,
    moon: LucideMoon.icon,
    sun: LucideSun.icon,
  });
}
