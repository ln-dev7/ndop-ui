import { Component } from '@angular/core';

/**
 * The leaf of Ndop's mark with its four diamond cut-outs, as in the logo's
 * masters (`apps/docs/brand/`), whose unit tests keep the two the same.
 */
export const MARK_PATH =
  'M48 10C74 30 74 66 48 86C22 66 22 30 48 10ZM48 20L55 27L48 34L41 27ZM48 34L60 41L48 48L36 41ZM48 48L60 55L48 62L36 55ZM48 62L55 69L48 76L41 69Z';

/**
 * Ndop's mark (ADR-0026), cropped to the leaf so it aligns by its own
 * edges: indigo, the brand's accent, in light mode, and the text color in
 * dark mode, where indigo has no contrast. Size it with a height on the
 * element; the width follows. Decorative: it sits beside the name.
 */
@Component({
  selector: 'docs-logo-mark',
  host: {
    class:
      'inline-block aspect-[39/76] shrink-0 text-brand dark:text-foreground',
  },
  template: `
    <svg
      viewBox="28.5 10 39 76"
      class="block size-full"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" fill-rule="evenodd" [attr.d]="path" />
    </svg>
  `,
})
export class LogoMark {
  protected readonly path = MARK_PATH;
}
