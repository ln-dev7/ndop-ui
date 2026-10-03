import { inject, Pipe, type PipeTransform } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/**
 * Trusts HTML generated at build time from the repository's own sources,
 * keeping Shiki's inline color variables, which sanitizing drops. Being
 * pure, it returns the same value for the same string, so Angular doesn't
 * rewrite the element, and lose its state, on every change detection.
 *
 * @example
 * ```html
 * <div [innerHTML]="item.introHtml | trustHtml"></div>
 * ```
 */
@Pipe({ name: 'trustHtml' })
export class TrustHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * Marks HTML as trusted.
   *
   * @param html - Build-time HTML.
   * @returns It, trusted.
   */
  transform(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
