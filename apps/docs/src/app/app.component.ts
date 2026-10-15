import { Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { injectCurrentPath } from './site/current-path';
import { SiteFooter } from './site/site-footer';
import { SiteHeader } from './site/site-header';
import { SiteToaster } from './site/toaster';

/**
 * Root component of the docs site: the header on every page, the
 * file-based routes from `src/app/pages`, the footer, and the toast
 * region. A block's preview page (`/blocks/<name>/preview`) is the block
 * alone, framed by the gallery (ADR-0022), so it gets none of them.
 */
@Component({
  selector: 'docs-root',
  // A column at least the screen's height, so a short page's footer sits
  // at the bottom rather than halfway up.
  host: {
    '[class.flex]': '!bare()',
    '[class.min-h-dvh]': '!bare()',
    '[class.flex-col]': '!bare()',
  },
  imports: [RouterOutlet, SiteHeader, SiteFooter, SiteToaster],
  template: `
    @if (bare()) {
      <router-outlet />
    } @else {
      <a
        [href]="path() + '#main'"
        class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
        >Skip to content</a
      >
      <docs-site-header />
      <router-outlet />
      <docs-site-footer />
      <docs-toaster />
    }
  `,
})
export class AppComponent {
  protected readonly path = injectCurrentPath();

  protected readonly bare = computed(() =>
    /^\/blocks\/[^/]+\/preview\/?$/.test(this.path()),
  );
}
