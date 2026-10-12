import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { themes } from 'virtual:ndop/themes';
import { ThemeSample } from './theme-sample';

/**
 * The theme gallery, `/themes` (ADR-0023): every `registry:theme` item,
 * each on a sample in light and dark side by side, with its install
 * command and a link that opens it in the theme studio.
 */
@Component({
  selector: 'docs-themes-gallery',
  imports: [RouterLink, NdIcon, Button, ThemeSample],
  host: { class: 'block' },
  template: `
    <main id="main" class="mx-auto max-w-[1440px] px-4 py-10 lg:px-6">
      <h1 class="text-3xl font-semibold tracking-tight">Themes</h1>
      <p class="mt-2 max-w-2xl text-muted-foreground">
        Every theme sets the same tokens, so the components look right under any
        of them, in light and dark. Install one with the CLI, or open it in the
        theme studio and make it yours.
      </p>
      <p class="mt-4">
        <a ndButton variant="outline" size="sm" routerLink="/themes/studio"
          >Open the theme studio</a
        >
      </p>

      <div class="mt-10 grid gap-16">
        @for (theme of themes; track theme.name) {
          <article
            [id]="theme.name"
            class="scroll-mt-20"
            [attr.aria-labelledby]="theme.name + '-title'"
          >
            <h2
              [id]="theme.name + '-title'"
              class="text-xl font-semibold tracking-tight"
            >
              {{ theme.title }}
            </h2>
            <p class="mt-1 text-muted-foreground">{{ theme.description }}</p>
            @if (theme.author) {
              <p class="mt-1 text-sm text-muted-foreground">
                {{ theme.author }}
              </p>
            }

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <button
                ndButton
                variant="outline"
                size="sm"
                class="font-mono text-xs"
                (click)="copy(theme.command)"
              >
                <svg
                  [ndIcon]="copied() === theme.command ? 'check' : 'terminal'"
                ></svg>
                {{ theme.command }}
                <span class="sr-only">, copy</span>
              </button>
              <a
                ndButton
                variant="ghost"
                size="sm"
                routerLink="/themes/studio"
                [queryParams]="{ from: theme.name }"
                >Open {{ theme.title }} in the studio</a
              >
            </div>

            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <figure>
                <figcaption class="mb-2 text-sm text-muted-foreground">
                  Light
                </figcaption>
                <docs-theme-sample
                  [name]="theme.name"
                  [vars]="theme.vars"
                  mode="light"
                />
              </figure>
              <figure>
                <figcaption class="mb-2 text-sm text-muted-foreground">
                  Dark
                </figcaption>
                <docs-theme-sample
                  [name]="theme.name"
                  [vars]="theme.vars"
                  mode="dark"
                />
              </figure>
            </div>
          </article>
        }
      </div>

      <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
    </main>
  `,
})
export class ThemesGallery {
  protected readonly themes = themes;
  protected readonly copied = signal('');
  protected readonly announcement = signal('');

  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    inject(Title).setTitle('Themes · Ndop UI');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Themes for Ndop UI, previewed in light and dark, to install with the CLI or edit in the theme studio.',
    });
  }

  /**
   * Copies a theme's install command and says so for two seconds.
   *
   * @param command - The command.
   */
  protected async copy(command: string): Promise<void> {
    if (!this.browser) return;
    try {
      await navigator.clipboard.writeText(command);
      this.copied.set(command);
      this.announcement.set('Copied the install command.');
      setTimeout(() => {
        this.copied.set('');
        this.announcement.set('');
      }, 2000);
    } catch {
      this.announcement.set("Your browser didn't allow the copy.");
    }
  }
}
