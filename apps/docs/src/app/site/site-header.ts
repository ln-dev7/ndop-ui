import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { NdIcon, type NdopThemeMode } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  DialogCloseButton,
  DialogContent,
  DialogOverlay,
  DialogTitle,
  NdDialog,
  NdDialogPortal,
  NdDialogTrigger,
} from '@/ui/dialog/dialog';
import {
  NdTooltip,
  NdTooltipPortal,
  NdTooltipTrigger,
  TooltipContent,
} from '@/ui/tooltip/tooltip';
import { Preferences } from './preferences';
import { CommandPalette } from './command-palette';
import { SiteNav } from './site-nav';

/** The order the theme button cycles through, and how each is shown. */
const MODES: { mode: NdopThemeMode; icon: string; label: string }[] = [
  { mode: 'system', icon: 'monitor', label: 'System theme' },
  { mode: 'light', icon: 'sun', label: 'Light theme' },
  { mode: 'dark', icon: 'moon', label: 'Dark theme' },
];

/** Shown until the saved scheme is known. */
const SYSTEM = {
  mode: 'system' as const,
  icon: 'monitor',
  label: 'System theme',
};

/**
 * The sticky site header: the logo, primary links, the search palette,
 * the theme and direction toggles, and, on small screens, a button that opens the navigation in a
 * bottom sheet.
 */
@Component({
  selector: 'docs-site-header',
  imports: [
    RouterLink,
    NdIcon,
    Button,
    NdDialog,
    NdDialogTrigger,
    NdDialogPortal,
    DialogOverlay,
    DialogContent,
    DialogTitle,
    DialogCloseButton,
    NdTooltip,
    NdTooltipTrigger,
    NdTooltipPortal,
    TooltipContent,
    SiteNav,
    CommandPalette,
  ],
  template: `
    <header
      class="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div
        class="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4 lg:px-6"
      >
        <ng-container ndDialog [(open)]="navigationOpen">
          <button
            ndButton
            ndDialogTrigger
            variant="ghost"
            size="icon"
            class="lg:hidden"
            aria-label="Open navigation"
          >
            <svg ndIcon="menu"></svg>
          </button>
          <ng-template ndDialogPortal>
            <div ndDialogOverlay></div>
            <div
              ndDialogContent
              class="top-auto bottom-0 left-0 max-h-[85vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-b-none p-6 sm:max-w-none"
            >
              <h2 ndDialogTitle>Navigation</h2>
              <docs-site-nav />
              <button ndDialogCloseButton>
                <svg ndIcon="x"></svg>
                <span class="sr-only">Close</span>
              </button>
            </div>
          </ng-template>
        </ng-container>

        <a routerLink="/" class="me-4 font-semibold tracking-tight">Ndop UI</a>
        <nav
          aria-label="Main"
          class="hidden items-center gap-4 text-sm md:flex"
        >
          <a
            routerLink="/docs/getting-started/introduction"
            class="text-muted-foreground hover:text-foreground"
            >Docs</a
          >
        </nav>

        <div class="ms-auto flex items-center gap-1">
          <docs-command-palette class="me-1" />
          <a
            ndButton
            variant="ghost"
            size="sm"
            href="https://github.com/valerymelou/ndop"
            >GitHub</a
          >
          <ng-container ndTooltip>
            <button
              ndButton
              ndTooltipTrigger
              variant="ghost"
              size="icon"
              [attr.aria-label]="current().label + ', switch theme'"
              (click)="cycleTheme()"
            >
              <svg [ndIcon]="current().icon"></svg>
            </button>
            <ng-template ndTooltipPortal>
              <div ndTooltipContent>{{ current().label }}</div>
            </ng-template>
          </ng-container>
          <ng-container ndTooltip>
            <button
              ndButton
              ndTooltipTrigger
              variant="ghost"
              size="icon"
              aria-label="Right-to-left"
              [attr.aria-pressed]="preferences.direction() === 'rtl'"
              (click)="toggleDirection()"
            >
              <svg ndIcon="languages"></svg>
            </button>
            <ng-template ndTooltipPortal>
              <div ndTooltipContent>Right-to-left</div>
            </ng-template>
          </ng-container>
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly preferences = inject(Preferences);

  /** Whether the small-screen navigation sheet is open. */
  protected readonly navigationOpen = signal(false);

  constructor() {
    // Following a link in the sheet navigates behind it; close it so the
    // new page is visible.
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navigationOpen.set(false));
  }

  protected readonly current = computed(
    () =>
      MODES.find((entry) => entry.mode === this.preferences.mode()) ?? SYSTEM,
  );

  /**
   * Moves to the next color scheme: system, light, dark.
   */
  protected cycleTheme(): void {
    const index = MODES.findIndex(
      (entry) => entry.mode === this.preferences.mode(),
    );
    this.preferences.setMode(
      MODES[(index + 1) % MODES.length]?.mode ?? 'system',
    );
  }

  /**
   * Flips the site between left-to-right and right-to-left.
   */
  protected toggleDirection(): void {
    this.preferences.setDirection(
      this.preferences.direction() === 'rtl' ? 'ltr' : 'rtl',
    );
  }
}
