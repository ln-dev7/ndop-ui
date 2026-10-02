import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';
import { provideNdop } from '@ndop/core';

/**
 * Providers shared by the browser and server builds. The harness runs
 * zoneless (Angular's default) with SSR and hydration, which is the
 * environment every primitive is tested in (RFC-0001, Phase 1).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(),
    provideClientHydration(),
    provideHttpClient(
      withFetch(),
      withInterceptors([requestContextInterceptor]),
    ),
    provideNdop({ theme: 'system' }),
  ],
};
