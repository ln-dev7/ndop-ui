import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { NdIcon } from '@ndop/core';
import { themeCss, themeTokens, type ThemeVars } from '@ndop/schema/theme';
import { Button } from '@/ui/button/button';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import { themeUrl } from './studio-theme';

/** What can be copied, by the label its button and announcement use. */
type Copyable = 'CSS' | 'JSON' | 'theme URL' | 'CLI command';

/**
 * The theme studio's exports (ADR-0023): the CSS to paste into the
 * Tailwind CSS file, the tokens as W3C Design Tokens JSON, the theme's
 * URL, a registry item the CLIs install, and the `ndop add` command for
 * it.
 */
@Component({
  selector: 'docs-theme-exports',
  imports: [NdIcon, Button, Input, Label],
  host: { class: 'block' },
  template: `
    <div class="grid gap-8">
      <section aria-labelledby="export-url-title" class="grid gap-3">
        <h3 id="export-url-title" class="font-semibold">Theme URL</h3>
        <p class="text-sm text-muted-foreground">
          A registry item for <code class="font-mono">ndop init --theme</code>,
          <code class="font-mono">ndop add</code> and the shadcn CLI. It holds
          the whole theme, so it never changes or expires.
        </p>
        <label ndLabel for="export-url" class="sr-only">Theme URL</label>
        <div class="flex gap-2">
          <input
            ndInput
            id="export-url"
            readonly
            class="font-mono text-xs"
            [value]="url()"
          />
          <button
            ndButton
            variant="outline"
            size="sm"
            (click)="copy('theme URL', url())"
          >
            <svg [ndIcon]="icon('theme URL')"></svg>
            Copy URL
          </button>
        </div>
        <label ndLabel for="export-cli" class="sr-only">CLI command</label>
        <div class="flex gap-2">
          <input
            ndInput
            id="export-cli"
            readonly
            class="font-mono text-xs"
            [value]="command()"
          />
          <button
            ndButton
            variant="outline"
            size="sm"
            (click)="copy('CLI command', command())"
          >
            <svg [ndIcon]="icon('CLI command')"></svg>
            Copy CLI command
          </button>
        </div>
      </section>

      <section aria-labelledby="export-css-title" class="grid gap-3">
        <div class="flex items-center gap-2">
          <h3 id="export-css-title" class="font-semibold">CSS</h3>
          <button
            ndButton
            variant="outline"
            size="sm"
            class="ms-auto"
            (click)="copy('CSS', css())"
          >
            <svg [ndIcon]="icon('CSS')"></svg>
            Copy CSS
          </button>
        </div>
        <p class="text-sm text-muted-foreground">
          Replaces the theme in your Tailwind CSS file, after
          <code class="font-mono">&#64;ndop/core/styles.css</code>.
        </p>
        <pre
          role="region"
          tabindex="0"
          aria-label="CSS stylesheet"
          data-export="css"
          class="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-5"
        ><code>{{ css() }}</code></pre>
      </section>

      <section aria-labelledby="export-json-title" class="grid gap-3">
        <div class="flex items-center gap-2">
          <h3 id="export-json-title" class="font-semibold">JSON</h3>
          <button
            ndButton
            variant="outline"
            size="sm"
            class="ms-auto"
            (click)="copy('JSON', json())"
          >
            <svg [ndIcon]="icon('JSON')"></svg>
            Copy JSON
          </button>
          <button ndButton variant="outline" size="sm" (click)="download()">
            <svg ndIcon="download"></svg>
            Download
          </button>
        </div>
        <p class="text-sm text-muted-foreground">
          The tokens in the W3C Design Tokens format, for design tools.
        </p>
        <pre
          role="region"
          tabindex="0"
          aria-label="JSON tokens"
          data-export="json"
          class="max-h-80 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-5"
        ><code>{{ json() }}</code></pre>
      </section>
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
  `,
})
export class ThemeExports {
  /** The theme to export. */
  readonly vars = input.required<ThemeVars>();

  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  // The production origin until the browser says otherwise, so the
  // prerendered page shows a working URL.
  private readonly origin = signal('https://ndop.dev');

  protected readonly copied = signal<Copyable | ''>('');
  protected readonly announcement = signal('');

  protected readonly css = computed(() => themeCss(this.vars()));
  protected readonly json = computed(
    () => `${JSON.stringify(themeTokens(this.vars()), null, 2)}\n`,
  );
  protected readonly url = computed(() => themeUrl(this.origin(), this.vars()));
  protected readonly command = computed(
    () => `npx @ndop/cli add "${this.url()}"`,
  );

  constructor() {
    afterNextRender(() => this.origin.set(location.origin));
  }

  /**
   * The icon of a copy button: a check for two seconds after a copy.
   *
   * @param what - What the button copies.
   * @returns The icon's name.
   */
  protected icon(what: Copyable): string {
    return this.copied() === what ? 'check' : 'copy';
  }

  /**
   * Copies an export and says so.
   *
   * @param what - What it is.
   * @param text - The text to copy.
   */
  protected async copy(what: Copyable, text: string): Promise<void> {
    if (!this.browser) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(what);
      this.announcement.set(`Copied the ${what}.`);
      setTimeout(() => {
        this.copied.set('');
        this.announcement.set('');
      }, 2000);
    } catch {
      this.announcement.set("Your browser didn't allow the copy.");
    }
  }

  /** Saves the JSON tokens as a file. */
  protected download(): void {
    if (!this.browser) return;
    const url = URL.createObjectURL(
      new Blob([this.json()], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ndop-theme.tokens.json';
    link.click();
    URL.revokeObjectURL(url);
  }
}
