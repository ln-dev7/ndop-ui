import type { Type } from '@angular/core';

/**
 * Every registry block, by name. The home page links each one at
 * `/blocks/<name>`, so prerendering and the e2e quality crawl cover them
 * (ADR-0022). A unit test keeps this list in sync with `registry/blocks`;
 * the `block` generator adds to it.
 */
export const BLOCKS: Readonly<Record<string, Type<unknown>>> = {};
