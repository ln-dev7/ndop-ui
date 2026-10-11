import type { EnvironmentProviders } from '@angular/core';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideBug,
  LucideCheck,
  LucideChevronDown,
  LucideCode,
  LucideCopy,
  LucideExternalLink,
  LucideFileText,
  LucideLanguages,
  LucideMenu,
  LucideMonitor,
  LucideMoon,
  LucidePencil,
  LucideSearch,
  LucideSmartphone,
  LucideSun,
  LucideTablet,
  LucideTerminal,
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
    'chevron-down': LucideChevronDown.icon,
    code: LucideCode.icon,
    copy: LucideCopy.icon,
    'external-link': LucideExternalLink.icon,
    'file-text': LucideFileText.icon,
    languages: LucideLanguages.icon,
    menu: LucideMenu.icon,
    monitor: LucideMonitor.icon,
    moon: LucideMoon.icon,
    pencil: LucidePencil.icon,
    search: LucideSearch.icon,
    smartphone: LucideSmartphone.icon,
    sun: LucideSun.icon,
    tablet: LucideTablet.icon,
    terminal: LucideTerminal.icon,
  });
}
