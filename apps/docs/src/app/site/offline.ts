import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  PLATFORM_ID,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

/**
 * Registers the service worker (`/sw.js`, ADR-0027) in production builds,
 * in the browser, once the page has loaded and the browser is idle, so it
 * never competes with the page's own start. The dev server has no worker.
 *
 * Then, so pages read offline:
 *
 * - The page that registered it is saved, with the code it loaded before
 *   the worker existed; each page opened in the app afterwards is saved
 *   too, since moving between pages loads no HTML.
 * - When a deploy has installed a new worker, the next navigation tells it
 *   to take over and loads the destination as a whole new page, so no page
 *   runs one build's code with another's.
 *
 * @returns Providers for the application config.
 */
export function provideOfflineReading(): EnvironmentProviders {
  return provideAppInitializer(() => {
    if (!import.meta.env.PROD || !isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    if (!('serviceWorker' in navigator)) return;
    const container = navigator.serviceWorker;
    const router = inject(Router);
    let waiting: ServiceWorker | undefined;

    const save = (urls: string[]) => {
      const saveData = (navigator as { connection?: { saveData?: boolean } })
        .connection?.saveData;
      if (!saveData) container.controller?.postMessage({ type: 'save', urls });
    };
    const track = (registration: ServiceWorkerRegistration) => {
      // An installed worker beside a controlling one is a new deploy's.
      const wait = (worker: ServiceWorker | null) => {
        if (worker && container.controller) waiting = worker;
      };
      wait(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed') wait(worker);
        });
      });
    };
    const register = async () => {
      const registration = await container
        .register('/sw.js')
        // Without a worker the site works as before, only not offline;
        // browsers refuse one in some private modes.
        .catch(() => undefined);
      if (!registration) return;
      track(registration);
      await container.ready;
      if (!container.controller) {
        await new Promise((resolve) =>
          container.addEventListener('controllerchange', resolve, {
            once: true,
          }),
        );
      }
      save([
        location.pathname,
        ...performance
          .getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(`${location.origin}/assets/`)),
      ]);
    };
    const idle = () =>
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(() => void register())
        : setTimeout(() => void register());
    if (document.readyState === 'complete') idle();
    else addEventListener('load', idle, { once: true });

    router.events.subscribe((event) => {
      if (event instanceof NavigationStart && waiting) {
        waiting.postMessage({ type: 'skip-waiting' });
        waiting = undefined;
        // Back and forward have already changed the address.
        if (event.navigationTrigger === 'popstate') location.reload();
        else location.assign(event.url);
      } else if (event instanceof NavigationEnd && event.id > 1) {
        save([event.urlAfterRedirects.split(/[?#]/)[0] ?? '/']);
      }
    });
  });
}
