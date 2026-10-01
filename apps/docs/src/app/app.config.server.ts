import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';

import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering()],
};

/**
 * Browser config plus server rendering, used by `main.server.ts` for SSR and
 * prerendering.
 */
export const config = mergeApplicationConfig(appConfig, serverConfig);
