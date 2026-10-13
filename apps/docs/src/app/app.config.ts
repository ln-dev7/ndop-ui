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
import { provideOfflineReading } from './site/offline';
import { Preferences } from './site/preferences';

/**
 * Application providers shared by the browser and server builds: file-based
 * routing with view transitions and anchor scrolling, hydration, Ndop's
 * theme, the docs' icons and, in production, the service worker.
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
    provideOfflineReading(),
    provideAppInitializer(() => {
      // Marks the page once it has hydrated and settled, which production
      // builds don't log, so tests and audits can wait for it. Parts that
      // hydrate on idle, such as the page menu, do so after the first
      // settling, so the mark waits for an idle period and settles again.
      if (isPlatformBrowser(inject(PLATFORM_ID))) {
        const root = inject(DOCUMENT).documentElement;
        const app = inject(ApplicationRef);
        const idle = () =>
          new Promise<void>((resolve) =>
            typeof requestIdleCallback === 'function'
              ? requestIdleCallback(() => resolve())
              : setTimeout(resolve, 50),
          );
        void app
          .whenStable()
          .then(idle)
          .then(() => app.whenStable())
          .then(() => root.setAttribute('data-hydrated', ''));
      }
      inject(Preferences).restore();
      // Anchor scrolls stop below the sticky header (3.5rem) with some air,
      // matching the scroll-margin-top the stylesheet gives headings.
      inject(ViewportScroller).setOffset([0, 80]);
    }),
  ],
};
