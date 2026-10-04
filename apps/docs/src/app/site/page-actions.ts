import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import type { ConnectedPosition } from '@angular/cdk/overlay';
import { Component, computed, input, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { commandFor, type PackageManager } from '../../highlight/shiki';
import { savedPackageManager } from './code-frames';

/** Where the docs are published; prompts link the live twins. */
const SITE = 'https://ndop.dev';

/** The menu opens below its button, aligned to the button's end. */
const BELOW_END: ConnectedPosition[] = [
  {
    originX: 'end',
    originY: 'bottom',
    overlayX: 'end',
    overlayY: 'top',
    offsetY: 4,
  },
  {
    originX: 'end',
    originY: 'top',
    overlayX: 'end',
    overlayY: 'bottom',
    offsetY: -4,
  },
];

/**
 * Copies a docs page's Markdown twin (`<path>.md`, ADR-0016) to the
 * clipboard. The text is fetched inside the clipboard write, so Safari
 * still sees the click that asked for it.
 *
 * @param path - The page's route, such as `/docs/components/dialog`.
 * @returns Whether the browser accepted it.
 */
export async function copyPageMarkdown(path: string): Promise<boolean> {
  const markdown = fetch(`${path}.md`).then(async (response) => {
    if (!response.ok) throw new Error(`${path}.md: ${response.status}`);
    return new Blob([await response.text()], { type: 'text/plain' });
  });
  try {
    if (typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': markdown }),
      ]);
    } else {
      await navigator.clipboard.writeText(await (await markdown).text());
    }
    return true;
  } catch {
    return false;
  }
}

/** What a component page adds to its menu. */
export interface ComponentLinks {
  /** Registry item name, for `ndop add`. */
  name: string;
  /** Its source on GitHub. */
  source: string;
  /** A new issue about it on GitHub. */
  issue: string;
}

/**
 * A page's actions, as one split button beside its title (ADR-0016,
 * amendment 7): "Copy page" copies the page's Markdown twin, and the menu
 * beside it opens the twin, opens it in Claude or ChatGPT, and on component
 * pages copies the install command or links the source and issues. The
 * menu is the CDK's (WAI-ARIA menu button pattern). Prompts link the
 * published twin rather than include it, since a whole page would exceed
 * URL length limits.
 */
@Component({
  selector: 'docs-page-actions',
  imports: [NdIcon, Button, CdkMenu, CdkMenuItem, CdkMenuTrigger],
  host: { class: 'inline-flex shrink-0' },
  template: `
    <button
      ndButton
      variant="secondary"
      size="sm"
      class="rounded-e-none"
      (click)="copyPage()"
    >
      <svg ndIcon="copy"></svg>
      Copy page
    </button>
    <button
      ndButton
      variant="secondary"
      size="icon-sm"
      class="rounded-s-none border-s border-background/60"
      aria-label="More page actions"
      [cdkMenuTriggerFor]="menu"
      [cdkMenuPosition]="positions"
    >
      <svg ndIcon="chevron-down"></svg>
    </button>
    <ng-template #menu>
      <div
        cdkMenu
        class="z-50 min-w-52 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      >
        <a
          cdkMenuItem
          class="page-menu-item"
          target="_blank"
          [href]="path() + '.md'"
        >
          <svg ndIcon="file-text"></svg>
          View as Markdown
        </a>
        <a
          cdkMenuItem
          class="page-menu-item"
          target="_blank"
          rel="noopener"
          [href]="claudeUrl()"
        >
          <svg ndIcon="external-link"></svg>
          Open in Claude
        </a>
        <a
          cdkMenuItem
          class="page-menu-item"
          target="_blank"
          rel="noopener"
          [href]="chatGptUrl()"
        >
          <svg ndIcon="external-link"></svg>
          Open in ChatGPT
        </a>
        @if (component(); as links) {
          <div role="separator" class="-mx-1 my-1 h-px bg-border"></div>
          <button
            cdkMenuItem
            type="button"
            class="page-menu-item"
            (cdkMenuItemTriggered)="copyInstall(links.name)"
          >
            <svg ndIcon="terminal"></svg>
            Copy install command
          </button>
          <a
            cdkMenuItem
            class="page-menu-item"
            target="_blank"
            rel="noopener"
            [href]="links.source"
          >
            <svg ndIcon="code"></svg>
            View source
          </a>
          <a
            cdkMenuItem
            class="page-menu-item"
            target="_blank"
            rel="noopener"
            [href]="links.issue"
          >
            <svg ndIcon="bug"></svg>
            Report issue
          </a>
        }
      </div>
    </ng-template>
    <p aria-live="polite" class="sr-only">{{ announcement() }}</p>
  `,
})
export class PageActions {
  /** The page's route, such as `/docs/components/dialog`. */
  readonly path = input.required<string>();
  /** The page's title, for the prompts. */
  readonly title = input.required<string>();
  /** On a component page, what its menu adds. */
  readonly component = input<ComponentLinks>();

  protected readonly positions = BELOW_END;
  protected readonly announcement = signal('');

  private readonly prompt = computed(
    () =>
      `Read ${SITE}${this.path()}.md, the Ndop UI documentation for ${this.title()}, and help me use it in my Angular app.`,
  );
  protected readonly claudeUrl = computed(
    () => `https://claude.ai/new?q=${encodeURIComponent(this.prompt())}`,
  );
  protected readonly chatGptUrl = computed(
    () => `https://chatgpt.com/?q=${encodeURIComponent(this.prompt())}`,
  );

  /** Copies the page's Markdown and says whether it worked. */
  protected async copyPage(): Promise<void> {
    const copied = await copyPageMarkdown(this.path());
    this.announcement.set(
      copied ? 'Copied the page as Markdown' : "Couldn't copy the page",
    );
  }

  /**
   * Copies `ndop add` for the reader's package manager.
   *
   * @param name - Registry item name.
   */
  protected async copyInstall(name: string): Promise<void> {
    const command = commandFor(
      (savedPackageManager() ?? 'npm') as PackageManager,
      `npx ndop add ${name}`,
    );
    try {
      await navigator.clipboard.writeText(command);
      this.announcement.set(`Copied ${command}`);
    } catch {
      this.announcement.set("Couldn't copy the command");
    }
  }
}
