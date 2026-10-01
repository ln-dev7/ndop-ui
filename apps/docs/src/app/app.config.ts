import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';

/**
 * Application providers shared by the browser and server builds: file-based
 * routing, hydration and `fetch`-backed HTTP with Analog's request context (FetchBackend is now Angular's default, so no need of withFetch).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideFileRouter(),
    provideClientHydration(),
    provideHttpClient(withInterceptors([requestContextInterceptor])),
  ],
};
