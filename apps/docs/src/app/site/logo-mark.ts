import { Component } from '@angular/core';
import { MARK_PATH } from './mark-path';

export { MARK_PATH } from './mark-path';

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
