import type { Plugin } from 'vite';

/**
 * Sets `ngServerMode` in every Angular package file the dev server renders
 * on the server. Analog 2.7.5 (and 2.8.0) does this only for files ending
 * in `core.mjs` or `platform-server.mjs`, but Angular 22 also reads the flag
 * from chunk files such as `_debug_node-chunk.mjs` and from
 * `@angular/common`, so browser-only hooks like `afterNextRender` ran during
 * dev SSR. Production builds define the flag and are unaffected. Used by
 * the harness and docs Vite configs.
 *
 * @returns A Vite plugin.
 *
 * @example
 * ```ts
 * plugins: [analog(), angularServerMode()]
 * ```
 */
export function angularServerMode(): Plugin {
  return {
    name: 'ndop-angular-server-mode',
    transform(code, id, options) {
      if (options?.ssr && /\/@angular\/[^/]+\/fesm2022\/[^/]+\.mjs$/.test(id)) {
        return { code: code.replaceAll('ngServerMode', 'true') };
      }
      return undefined;
    },
  };
}
