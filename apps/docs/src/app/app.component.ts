import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { injectCurrentPath } from './site/current-path';
import { SiteFooter } from './site/site-footer';
import { SiteHeader } from './site/site-header';

/**
 * Root component of the docs site: the header on every page, the
 * file-based routes from `src/app/pages`, then the footer.
 */
@Component({
  selector: 'docs-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  template: `
    <a
      [href]="path() + '#main'"
      class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
      >Skip to content</a
    >
    <docs-site-header />
    <router-outlet />
    <docs-site-footer />
  `,
})
export class AppComponent {
  protected readonly path = injectCurrentPath();
}
