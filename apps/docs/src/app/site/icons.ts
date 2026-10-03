import type { EnvironmentProviders } from '@angular/core';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideBug,
  LucideCheck,
  LucideCode,
  LucideCopy,
  LucideExternalLink,
  LucideLanguages,
  LucideMenu,
  LucideMonitor,
  LucideMoon,
  LucidePencil,
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
    bug: LucideBug.icon,
    check: LucideCheck.icon,
    code: LucideCode.icon,
    copy: LucideCopy.icon,
    'external-link': LucideExternalLink.icon,
    languages: LucideLanguages.icon,
    menu: LucideMenu.icon,
    monitor: LucideMonitor.icon,
    moon: LucideMoon.icon,
    pencil: LucidePencil.icon,
    sun: LucideSun.icon,
  });
}
