import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { NdIcon, type NdopThemeMode } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { Separator } from '@/ui/separator/separator';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHandle,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from '@/ui/drawer/drawer';
import {
  Tooltip,
  TooltipPortal,
  TooltipTrigger,
  TooltipContent,
} from '@/ui/tooltip/tooltip';
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

/** GitHub's mark, from Octicons' `mark-github` at 16px (MIT License). */
const GITHUB_MARK =
  'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z';

/** Shown until the saved scheme is known. */
const SYSTEM = {
  mode: 'system' as const,
  icon: 'monitor',
  label: 'System theme',
};

/**
 * The sticky site header: the logo, primary links, the search palette,
 * a GitHub link and the theme toggle, set apart by separators; on small
 * screens, a button that opens the navigation in a bottom sheet that can
 * be dragged down to close. Its controls hydrate when first needed.
 */
@Component({
  selector: 'docs-site-header',
  host: {
    // No box of its own: the root is a flex column, and a sticky header
    // only sticks within its parent, so the parent must be the page.
    class: 'contents',
    '(document:keydown)': 'requestPalette($event)',
  },
  imports: [
    RouterLink,
    NdIcon,
    Button,
    Drawer,
    DrawerTrigger,
    DrawerPortal,
    DrawerOverlay,
    DrawerContent,
    DrawerHandle,
    DrawerTitle,
    DrawerClose,
    Tooltip,
    TooltipTrigger,
    TooltipPortal,
    TooltipContent,
    SiteNav,
    CommandPalette,
    LogoMark,
    Separator,
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
          <ng-container ndDrawer [(open)]="navigationOpen">
            <button
              ndButton
              ndDrawerTrigger
              variant="ghost"
              size="icon"
              class="lg:hidden"
              aria-label="Open navigation"
            >
              <svg ndIcon="menu"></svg>
            </button>
            <!-- A bottom sheet: it slides up with a spring-like ease-out and
                 back down on close (Angular's animate.leave keeps it until
                 its exit animation ends; its classes are important to beat
                 the open state's animate-in), and can be dragged down from
                 its top to close. -->
            <ng-template ndDrawerPortal>
              <div
                ndDrawerOverlay
                class="data-[state=open]:duration-300 motion-reduce:animate-none"
                animate.leave="animate-out! fade-out-0 duration-200! motion-reduce:animate-none!"
              ></div>
              <div
                ndDrawerContent
                class="max-h-[85svh] data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.32,0.72,0,1)]"
                animate.leave="animate-out! slide-out-to-bottom duration-200! ease-[cubic-bezier(0.32,0,0.67,0)]! motion-reduce:animate-none!"
              >
                <div ndDrawerHandle></div>
                <div class="flex items-center justify-between gap-2 px-6 pt-4">
                  <h2 ndDrawerTitle>Navigation</h2>
                  <button
                    ndButton
                    ndDrawerClose
                    variant="ghost"
                    size="icon-sm"
                    class="-me-2"
                    aria-label="Close"
                  >
                    <svg ndIcon="x"></svg>
                  </button>
                </div>
                <!-- Scrolls without dragging the sheet. -->
                <div class="overflow-y-auto px-6 pb-6" data-no-drag>
                  <div class="my-4 flex items-center gap-2">
                    <!-- The header's own links hide on small screens. -->
                    <nav aria-label="Site" class="flex gap-2 text-sm">
                      <a
                        ndButton
                        variant="outline"
                        size="sm"
                        routerLink="/blocks"
                        >Blocks</a
                      >
                      <a
                        ndButton
                        variant="outline"
                        size="sm"
                        routerLink="/themes"
                        >Themes</a
                      >
                      <a ndButton variant="outline" size="sm" routerLink="/blog"
                        >Blog</a
                      >
                    </nav>
                  </div>
                  <docs-site-nav />
                </div>
              </div>
            </ng-template>
          </ng-container>
        }

        <a
          routerLink="/"
          class="me-2 flex shrink-0 items-center gap-2 font-semibold tracking-tight whitespace-nowrap"
        >
          <!-- 1px up centers the leaf on the capitals. -->
          <docs-logo-mark class="h-5 -translate-y-px" />
          Ndop UI
        </a>
        <nav aria-label="Main" class="hidden items-center gap-1 md:flex">
          <a
            ndButton
            variant="ghost"
            size="sm"
            routerLink="/docs/getting-started/introduction"
            >Docs</a
          >
          <a ndButton variant="ghost" size="sm" routerLink="/blocks">Blocks</a>
          <a ndButton variant="ghost" size="sm" routerLink="/themes">Themes</a>
          <a ndButton variant="ghost" size="sm" routerLink="/blog">Blog</a>
        </nav>

        <div class="ms-auto flex items-center gap-2">
          <!-- ⌘K before the palette hydrates is caught below and opens it
               once it has. -->
          @defer (
            on immediate;
            hydrate on interaction;
            hydrate when paletteRequested()
          ) {
            <docs-command-palette [openOnStart]="paletteRequested()" />
          }
          <!-- Soon after load, so the icon and label follow a saved
               scheme the server couldn't know. -->
          <div
            ndSeparator
            orientation="vertical"
            class="mx-1 data-[orientation=vertical]:h-4"
          ></div>
          @defer (on immediate; hydrate on idle) {
            <ng-container ndTooltip>
              <a
                ndButton
                ndTooltipTrigger
                variant="ghost"
                size="icon"
                aria-label="GitHub"
                href="https://github.com/ndop-ui/ui"
              >
                <!-- GitHub's mark (Octicons mark-github, MIT); Lucide has
                     no brand icons. -->
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path fill="currentColor" [attr.d]="githubMark" />
                </svg>
              </a>
              <ng-template ndTooltipPortal>
                <div ndTooltipContent>GitHub</div>
              </ng-template>
            </ng-container>
            <div
              ndSeparator
              orientation="vertical"
              class="mx-1 data-[orientation=vertical]:h-4"
            ></div>
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
            <!-- The direction toggle is hidden until right-to-left is ready
                 to show off; a saved direction still applies. -->
          }
        </div>
      </div>
    </header>
  `,
})
export class SiteHeader {
  protected readonly preferences = inject(Preferences);

  /** GitHub's mark, Octicons' `mark-github` at 16px (MIT). */
  protected readonly githubMark = GITHUB_MARK;

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
}
