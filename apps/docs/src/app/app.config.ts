import {
  ApplicationConfig,
  ApplicationRef,
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser, ViewportScroller } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideClientHydration,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';
import { provideNdop } from '@ndop/core';
import { provideDocsIcons } from './site/icons';
import { Preferences } from './site/preferences';

/**
 * Application providers shared by the browser and server builds: file-based
 * routing with view transitions and anchor scrolling, hydration, Ndop's
 * theme and the docs' icons.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
      // No transition on the first render, which hydrates the
      // prerendered page in place.
      withViewTransitions({ skipInitialTransition: true }),
    ),
    // Previews hydrate when they scroll into view (ADR-0016).
    provideClientHydration(withIncrementalHydration()),
    provideHttpClient(withInterceptors([requestContextInterceptor])),
    provideNdop({ theme: 'system' }),
    provideDocsIcons(),
    provideAppInitializer(() => {
      // Marks the page once it has hydrated and settled, which production
      // builds don't log, so tests and audits can wait for it.
      if (isPlatformBrowser(inject(PLATFORM_ID))) {
        const root = inject(DOCUMENT).documentElement;
        void inject(ApplicationRef)
          .whenStable()
          .then(() => root.setAttribute('data-hydrated', ''));
      }
      inject(Preferences).restore();
      // Anchor scrolls stop below the sticky header (3.5rem) with some air,
      // matching the scroll-margin-top the stylesheet gives headings.
      inject(ViewportScroller).setOffset([0, 80]);
    }),
  ],
};
