import { APP_ID, inject, Injectable } from '@angular/core';

/**
 * Hands out unique element ids, prefixed with the app id so several Angular
 * apps on one page never collide.
 */
@Injectable({ providedIn: 'root' })
export class NdIdGenerator {
  private readonly appId = inject(APP_ID);
  private counter = 0;

  /**
   * Returns a new id.
   *
   * @param prefix - Readable prefix, such as `nd-dialog-title`.
   * @returns An id unique within the app.
   */
  next(prefix: string): string {
    return `${prefix}-${this.appId}-${this.counter++}`;
  }
}

/**
 * Returns a new unique element id. Call it in an injection context, such as
 * a field initializer.
 *
 * @param prefix - Readable prefix, such as `nd-dialog-title`.
 * @returns An id unique within the app.
 *
 * @example
 * ```ts
 * protected readonly generatedId = injectId('nd-dialog-title');
 * ```
 */
export function injectId(prefix: string): string {
  return inject(NdIdGenerator).next(prefix);
}
