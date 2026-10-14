import { Component } from '@angular/core';
import { LogoMark } from './logo-mark';

/** Where Ndop UI's source lives. */
const REPOSITORY = 'https://github.com/ndop-ui/ui';

/** Classes of the footer's links. */
const LINK = 'font-medium underline underline-offset-4 hover:text-foreground';

/**
 * The site footer on every page: Ndop's mark (ADR-0026), who built Ndop UI and where its source
 * is, and the credit to shadcn/ui, whose styles and default palette the
 * registry items adapt, with a link to the registry's license and
 * notices (ADR-0014, amendment 2).
 */
@Component({
  selector: 'docs-site-footer',
  imports: [LogoMark],
  template: `
    <footer>
      <div
        class="mx-auto max-w-[1440px] px-4 py-6 text-center text-sm text-balance text-muted-foreground lg:px-6"
      >
        <div class="mb-3 flex justify-center">
          <docs-logo-mark class="h-6" />
        </div>
        <p>
          Built by
          <a href="https://x.com/valerymelou" [class]="link">valerymelou</a>.
          The source code is available on
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
