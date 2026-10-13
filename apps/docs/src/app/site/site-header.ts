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
  Dialog,
  DialogPortal,
  DialogTrigger,
} from '@/ui/dialog/dialog';
import {
  Tooltip,
  TooltipPortal,
  TooltipTrigger,
  TooltipContent,
} from '@/ui/tooltip/tooltip';
import { InstallApp } from './install';
import { LogoMark } from './logo-mark';
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
 * the theme and direction toggles, "Install app" when the browser offers
 * it, and, on small screens, a button that opens the navigation in a
 * bottom sheet, where installation is offered instead. Its controls hydrate when first
 * needed.
 */
@Component({
  selector: 'docs-site-header',
  host: { '(document:keydown)': 'requestPalette($event)' },
  imports: [
    RouterLink,
    NdIcon,
    Button,
    Dialog,
    DialogTrigger,
    DialogPortal,
    DialogOverlay,
    DialogContent,
    DialogTitle,
    DialogCloseButton,
    Tooltip,
    TooltipTrigger,
    TooltipPortal,
    TooltipContent,
    SiteNav,
    CommandPalette,
    LogoMark,
  ],
  template: `
    <header
      class="sticky top-0 z-40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
    >
      <div
        class="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4 lg:px-6"
      >
        <!-- The header's controls hydrate when they're first needed: all of
             them at once were most of a page's startup work on a slow phone
             (ADR-0016, "Quality gates"). The server renders them all, and
             a click that hydrates one is replayed to it. -->
        @defer (on immediate; hydrate on interaction) {
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
                <div class="my-4 flex items-center gap-2">
                  <!-- The header's own links hide on small screens. -->
                  <nav aria-label="Site" class="flex gap-2 text-sm">
                    <a ndButton variant="outline" size="sm" routerLink="/blocks"
                      >Blocks</a
                    >
                    <a ndButton variant="outline" size="sm" routerLink="/themes"
                      >Themes</a
                    >
                  </nav>
                  @if (installer.available()) {
                    <button
                      ndButton
                      variant="outline"
                      size="sm"
                      class="ms-auto"
                      (click)="installer.install()"
                    >
                      <svg ndIcon="download"></svg>
                      Install app
                    </button>
                  }
                </div>
                @if (installer.iosHint()) {
                  <!-- iOS Safari has no install prompt (ADR-0027). -->
                  <aside
                    aria-label="Install"
                    class="mb-4 flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm"
                  >
                    <p class="flex-1 pt-0.5 text-muted-foreground">
                      Install Ndop UI: tap Share
                      <svg
                        ndIcon="share"
                        class="inline size-4 align-[-0.1875rem] text-foreground"
                      ></svg
                      >, then
                      <span
                        class="font-medium whitespace-nowrap text-foreground"
                        >Add to Home Screen</span
                      >.
                    </p>
                    <button
                      ndButton
                      variant="ghost"
                      size="icon-sm"
                      class="-me-1 -mt-1 shrink-0"
                      aria-label="Dismiss"
                      (click)="installer.dismissHint()"
                    >
                      <svg ndIcon="x"></svg>
                    </button>
                  </aside>
                }
                <docs-site-nav />
                <button ndDialogCloseButton>
                  <svg ndIcon="x"></svg>
                  <span class="sr-only">Close</span>
                </button>
              </div>
            </ng-template>
          </ng-container>
        }

        <a
          routerLink="/"
          class="me-4 flex items-center gap-2 font-semibold tracking-tight"
        >
          <!-- 1px up centers the leaf on the capitals. -->
          <docs-logo-mark class="h-5 -translate-y-px" />
          Ndop UI
        </a>
        <nav
          aria-label="Main"
          class="hidden items-center gap-4 text-sm md:flex"
        >
          <a
            routerLink="/docs/getting-started/introduction"
            class="text-muted-foreground hover:text-foreground"
            >Docs</a
          >
          <a
            routerLink="/blocks"
            class="text-muted-foreground hover:text-foreground"
            >Blocks</a
          >
          <a
            routerLink="/themes"
            class="text-muted-foreground hover:text-foreground"
            >Themes</a
          >
        </nav>

        <div class="ms-auto flex items-center gap-1">
          <!-- ⌘K before the palette hydrates is caught below and opens it
               once it has. -->
          @defer (
            on immediate;
            hydrate on interaction;
            hydrate when paletteRequested()
          ) {
            <docs-command-palette
              class="me-1"
              [openOnStart]="paletteRequested()"
            />
          }
          <a
            ndButton
            variant="ghost"
            size="sm"
            href="https://github.com/ndop-ui/ui"
            >GitHub</a
          >
          <!-- Soon after load, so the icon and label follow a saved
               scheme the server couldn't know. -->
          @defer (on immediate; hydrate on idle) {
            <!-- Small screens offer it in the navigation sheet. -->
            @if (installer.available()) {
              <ng-container ndTooltip>
                <button
                  ndButton
                  ndTooltipTrigger
                  variant="ghost"
                  size="icon"
                  class="hidden lg:inline-flex"
                  aria-label="Install app"
                  (click)="installer.install()"
                >
                  <svg ndIcon="monitor-down"></svg>
                </button>
                <ng-template ndTooltipPortal>
                  <div ndTooltipContent>Install app</div>
                </ng-template>
              </ng-container>
            }
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
          }
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly preferences = inject(Preferences);
  protected readonly installer = inject(InstallApp);

  /** Whether the small-screen navigation sheet is open. */
  protected readonly navigationOpen = signal(false);

  /** Whether ⌘K was pressed before the palette hydrated. */
  protected readonly paletteRequested = signal(false);

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
   * Catches the first ⌘K or Ctrl+K, which hydrates the palette and opens
   * it; from then on the palette handles the shortcut itself.
   *
   * @param event - A key press on the page.
   */
  protected requestPalette(event: KeyboardEvent): void {
    if (this.paletteRequested()) return;
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.paletteRequested.set(true);
    }
  }

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
