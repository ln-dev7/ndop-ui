import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';

/**
 * Renders HTML generated at build time from the repository's own sources
 * (code blocks, prose, descriptions) into its host, as `[innerHTML]` does,
 * but leaves the server's copy in place when the page hydrates.
 * `[innerHTML]` writes its value again on hydration, which threw away and
 * re-parsed every code block's thousands of spans: the largest task of a
 * component page on a slow phone (ADR-0016, "Quality gates"). Later values,
 * such as after navigating to another page, are written as usual. The HTML
 * isn't sanitized, so that Shiki's inline color variables survive.
 *
 * @example
 * ```html
 * <div class="prose" [docsHtml]="guide.html"></div>
 * ```
 */
@Directive({ selector: '[docsHtml]' })
export class StaticHtml {
  /** The HTML, from the docs' build. */
  readonly html = input.required<string>({ alias: 'docsHtml' });

  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const renderer = inject(Renderer2);
    // Content already in the host when it's created in the browser came
    // from the server: hydration leaves nodes that no template declares.
    let hydrated =
      isPlatformBrowser(inject(PLATFORM_ID)) && host.hasChildNodes();
    effect(() => {
      const html = this.html();
      if (hydrated) {
        hydrated = false;
        return;
      }
      renderer.setProperty(host, 'innerHTML', html);
    });
  }
}
