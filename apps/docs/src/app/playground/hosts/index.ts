import type { PlaygroundHost } from '../playground';

/**
 * Every item's playground, loaded with its page. Label has none: its only
 * input, `for`, names another element.
 */
export const playgrounds: Readonly<
  Record<string, () => Promise<PlaygroundHost>>
> = {
  badge: () => import('./badge').then((m) => m.playground),
  button: () => import('./button').then((m) => m.playground),
  dialog: () => import('./dialog').then((m) => m.playground),
  input: () => import('./input').then((m) => m.playground),
  popover: () => import('./popover').then((m) => m.playground),
  separator: () => import('./separator').then((m) => m.playground),
  tooltip: () => import('./tooltip').then((m) => m.playground),
};
