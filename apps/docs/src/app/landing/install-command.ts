import { isPlatformBrowser } from '@angular/common';
import { Component, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';

/**
 * A shell command in a chip with a copy button, as on the landing page's
 * hero (ADR-0026). The button shows a check for two seconds after a copy,
 * and a polite live region says whether the copy worked.
 */
@Component({
  selector: 'docs-install-command',
  imports: [NdIcon, Button],
  host: { class: 'inline-flex max-w-full' },
  template: `
    <div
      class="inline-flex h-10 max-w-full items-center gap-3 rounded-lg border bg-background ps-3.5 pe-1 font-mono text-[0.8125rem] shadow-xs"
    >
      <!-- On the narrowest phones a long command scrolls inside the chip
           rather than widening the page. -->
      <code
        class="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]"
        dir="ltr"
      >
        <span class="text-muted-foreground select-none" aria-hidden="true"
          >$</span
        >{{ command() }}
      </code>
      <button
        ndButton
        variant="ghost"
        size="icon-sm"
        class="text-muted-foreground hover:text-foreground"
        [attr.aria-label]="'Copy ' + command()"
        (click)="copy()"
      >
        <svg [ndIcon]="copied() ? 'check' : 'copy'"></svg>
      </button>
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
  `,
})
export class InstallCommand {
  /** The command shown and copied. */
  readonly command = input.required<string>();

  protected readonly copied = signal(false);
  protected readonly announcement = signal('');

  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Copies the command and says so. */
  protected async copy(): Promise<void> {
    if (!this.browser) return;
    try {
      await navigator.clipboard.writeText(this.command());
    } catch {
      this.announcement.set("Couldn't copy the command");
      return;
    }
    this.copied.set(true);
    this.announcement.set(`Copied ${this.command()}`);
    setTimeout(() => {
      this.copied.set(false);
      this.announcement.set('');
    }, 2000);
  }
}
