import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  inject,
  signal,
  type ElementRef,
  viewChild,
} from '@angular/core';
import { DiamondBand } from './diamond-band';
import { ShowcaseColumn1 } from './showcase-column-1';
import { ShowcaseColumn2 } from './showcase-column-2';
import { ShowcaseColumn3 } from './showcase-column-3';
import { ShowcaseColumn4 } from './showcase-column-4';
import { PICKER_THEMES, ThemePicker } from './theme-picker';

/** How long a theme switch fades, in milliseconds. */
const FADE = 300;

/** The theme the showcase opens on, Valery's choice (ADR-0026, amendment 1). */
const INITIAL_THEME = 'default';

/**
 * The landing page's showcase (ADR-0026, amendment 1): small, realistic
 * cards built from registry items, in four columns on wide screens, two
 * on tablets and a curated six in one column on phones, under a strip of
 * diamonds and a theme picker that restyles the whole showcase in place.
 *
 * The picked theme's tokens are custom properties on the showcase's
 * surface (see `demoTokens`), which follows the site's light and dark
 * mode through `color-scheme`. None of the cards opens an overlay, which
 * would render outside that surface. Each column hydrates as it scrolls
 * into view; the picker hydrates with the page.
 *
 * Its bottom fades into the page. The fade is a mask, so the cards under
 * it stay real and reachable: while keyboard focus is anywhere in the
 * showcase the mask drops, so a focused control is never faded, and
 * screen readers read every card in full.
 */
@Component({
  selector: 'docs-showcase',
  imports: [
    DiamondBand,
    ShowcaseColumn1,
    ShowcaseColumn2,
    ShowcaseColumn3,
    ShowcaseColumn4,
    ThemePicker,
  ],
  host: {
    class: 'relative block [color-scheme:light] dark:[color-scheme:dark]',
  },
  template: `
    <section aria-labelledby="showcase-title">
      <docs-diamond-band
        patternId="showcase-band"
        class="text-brand/20 dark:text-white/[0.1]"
      />
      <!-- Faint bands in the side gutters, outside the container: they
           fade toward the window's edges and never sit behind text. -->
      @for (side of sides; track side) {
        <div
          class="pointer-events-none absolute top-10 bottom-0 grid content-start gap-24 pt-24 text-brand/[0.08] dark:text-white/[0.05]"
          [class]="side.class"
          aria-hidden="true"
        >
          @for (band of gutterBands; track band) {
            <docs-diamond-band
              [patternId]="'gutter-' + side.name + '-' + band"
            />
          }
        </div>
      }

      <div class="relative mx-auto max-w-[1440px] px-4 pt-10 lg:px-6">
        <h2 id="showcase-title" class="sr-only">Component showcase</h2>
        <div class="mb-6 flex justify-center">
          <docs-theme-picker [(theme)]="theme" (themeChange)="fade()" />
        </div>
        <div
          #surface
          data-testid="showcase"
          class="grid grid-cols-1 gap-4 text-foreground [mask-image:linear-gradient(to_bottom,#000_calc(100%-15rem),transparent)] has-[:focus-visible]:[mask-image:none] md:[mask-image:linear-gradient(to_bottom,#000_68%,transparent)] md:has-[:focus-visible]:[mask-image:none] data-switching:**:transition-[color,background-color,border-color,fill,stroke,box-shadow] data-switching:**:duration-300 data-switching:**:ease-out md:grid-cols-2 xl:grid-cols-4"
          [attr.data-theme]="theme()"
          [style]="tokens()"
        >
          @defer (on immediate; hydrate on viewport) {
            <docs-showcase-column-1 />
          }
          @defer (on immediate; hydrate on viewport) {
            <docs-showcase-column-2 />
          }
          @defer (on immediate; hydrate on viewport) {
            <docs-showcase-column-3 />
          }
          @defer (on immediate; hydrate on viewport) {
            <docs-showcase-column-4 />
          }
        </div>
      </div>
    </section>
  `,
})
export class Showcase {
  /** The picked theme's name. */
  protected readonly theme = signal(
    PICKER_THEMES.find((theme) => theme.name === INITIAL_THEME)?.name ??
      PICKER_THEMES[0]?.name ??
      '',
  );

  protected readonly tokens = computed(
    () =>
      PICKER_THEMES.find((theme) => theme.name === this.theme())?.tokens ?? {},
  );

  // Physical sides: the bands are symmetric, so right-to-left needs no
  // mirroring, and logical insets are lowered to language checks by the
  // CSS build, which an English page in right-to-left mode would fail.
  protected readonly sides = [
    {
      name: 'left',
      class:
        'left-0 w-[max(0px,calc((100%-1440px)/2))] [mask-image:linear-gradient(to_left,#000,transparent)]',
    },
    {
      name: 'right',
      class:
        'right-0 w-[max(0px,calc((100%-1440px)/2))] [mask-image:linear-gradient(to_right,#000,transparent)]',
    },
  ];

  protected readonly gutterBands = [1, 2, 3, 4, 5];

  private readonly surface =
    viewChild.required<ElementRef<HTMLElement>>('surface');
  private readonly window = inject(DOCUMENT).defaultView;
  private timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Fades the colors into the picked theme's, unless the reader asked for
   * less motion. The attribute is set in the same task as the new tokens,
   * so their change is what transitions.
   */
  protected fade(): void {
    if (this.window?.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const element = this.surface().nativeElement;
    element.setAttribute('data-switching', '');
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => element.removeAttribute('data-switching'),
      FADE,
    );
  }
}
