import type { Type } from '@angular/core';

const MODULES = import.meta.glob<Record<string, Type<unknown>>>([
  '../../../../../registry/examples/*.ts',
  '!**/*.spec.ts',
]);

/**
 * A loader for every registry example, by name. Each example is its own
 * chunk, so an example page loads only that example's code: importing
 * them all made every page request hundreds of modules from the dev
 * server, more than Chrome allows at once.
 */
export const EXAMPLES: Readonly<Record<string, () => Promise<Type<unknown>>>> =
  Object.fromEntries(
    Object.entries(MODULES).map(([path, load]) => [
      path.replace(/^.*\/|\.ts$/g, ''),
      // Each example file exports its one component.
      async () => Object.values(await load())[0] as Type<unknown>,
    ]),
  );
