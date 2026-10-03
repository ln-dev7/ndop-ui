import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

/**
 * The current route's path, without query or fragment, as a signal.
 * In-page links need it: with `<base href="/">`, a bare `#id` resolves
 * against the site root, not the page.
 *
 * @returns A signal of the path, such as `/docs/getting-started/theming`.
 */
export function injectCurrentPath() {
  const router = inject(Router);
  const path = () => router.url.split(/[?#]/)[0] ?? '/';
  return toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(path),
    ),
    { initialValue: path() },
  );
}
