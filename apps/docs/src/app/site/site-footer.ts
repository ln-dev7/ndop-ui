import { Component } from '@angular/core';

/** Where Ndop UI's source lives. */
const REPOSITORY = 'https://github.com/ndop-ui/ui';

/** Classes of the footer's links. */
const LINK = 'font-medium underline underline-offset-4 hover:text-foreground';

/**
 * The site footer on every page: who built Ndop UI and where its source
 * is, and the credit to shadcn/ui, whose styles and default palette the
 * registry items adapt, with a link to the registry's license and
 * notices (ADR-0014, amendment 2).
 */
@Component({
  selector: 'docs-site-footer',
  template: `
    <footer>
      <div
        class="mx-auto max-w-[1440px] px-4 py-6 text-center text-sm text-balance text-muted-foreground lg:px-6"
      >
        <p>
          Built by
          <a href="https://github.com/valerymelou" [class]="link"
            >Valery Melou</a
          >. The source code is available on
          <a [href]="repository" [class]="link">GitHub</a>.
        </p>
        <p class="mt-1">
          Styles adapted from
          <a href="https://ui.shadcn.com" [class]="link">shadcn/ui</a>, MIT
          licensed. See the
          <a href="/r/LICENSE.txt" [class]="link"
            >license and third-party notices</a
          >.
        </p>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly link = LINK;
  protected readonly repository = REPOSITORY;
}
