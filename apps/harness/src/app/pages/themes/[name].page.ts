import {
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  inject,
  Renderer2,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { themeSheetCss } from '../../themes/theme-css';
import { ThemeSheet } from '../../themes/theme-sheet';
import { THEMES, themeProblems } from '../../themes/themes';

/** The id of the `<style>` element that holds the sheet's theme. */
const STYLE_ID = 'harness-theme-sheet';

/**
 * The first family of a font stack, as a person would name it.
 *
 * @param stack - A `font-sans` or `font-mono` value.
 * @returns Its first family without quotes or the `Variable` suffix.
 */
function family(stack: string | undefined): string {
  return (
    stack
      ?.split(',')[0]
      ?.trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/ Variable$/, '') || 'System'
  );
}

/**
 * Theme sheet page (`/themes/<name>`): one registry theme on a
 * representative set of styled items, for the visual tests (ADR-0023,
 * amendment 1). The theme's values go in a stylesheet scoped to the page's
 * `main`, written into the document head on the server and in the browser,
 * so the sheet takes the theme's light or dark values exactly where an
 * installed theme would. A theme whose fonts the harness doesn't load shows
 * why instead of the sheet, and logs it, which fails the e2e quality test.
 */
@Component({
  selector: 'harness-theme-sheet-page',
  imports: [ThemeSheet],
  template: `
    <main
      [attr.data-theme-sheet]="theme() ? name() : null"
      class="bg-background text-foreground min-h-dvh font-sans"
    >
      <div class="mx-auto grid max-w-6xl gap-8 px-8 py-10">
        @if (theme()) {
          <header class="flex items-end justify-between gap-6 border-b pb-6">
            <div class="grid gap-1">
              <p class="text-muted-foreground text-sm font-medium">
                Theme sheet
              </p>
              <h1 class="text-3xl font-semibold tracking-tight">
                {{ title() }}
              </h1>
            </div>
            <dl class="flex gap-8 text-sm">
              @for (fact of facts(); track fact.label) {
                <div class="grid gap-1">
                  <dt class="text-muted-foreground">{{ fact.label }}</dt>
                  <dd class="font-medium" [class.font-mono]="fact.mono">
                    {{ fact.value }}
                  </dd>
                </div>
              }
            </dl>
          </header>
          @if (problems().length > 0) {
            <ul role="alert" class="text-destructive grid gap-2">
              @for (problem of problems(); track problem) {
                <li>{{ problem }}</li>
              }
            </ul>
          } @else {
            <harness-theme-sheet />
          }
        } @else {
          <h1 class="text-2xl font-semibold">No theme named {{ name() }}</h1>
        }
      </div>
    </main>
  `,
})
export default class ThemeSheetPage {
  private readonly route = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);

  protected readonly name = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('name') ?? '')),
    { initialValue: '' },
  );

  protected readonly theme = computed(() => THEMES[this.name()]);

  protected readonly title = computed(
    () => `${this.name().charAt(0).toUpperCase()}${this.name().slice(1)} theme`,
  );

  protected readonly facts = computed(() => {
    const vars = this.theme()?.vars;
    return [
      { label: 'Sans', value: family(vars?.theme['font-sans']), mono: false },
      { label: 'Mono', value: family(vars?.theme['font-mono']), mono: true },
      {
        label: 'Radius',
        value: vars?.light['radius'] ?? 'Default',
        mono: false,
      },
    ];
  });

  protected readonly problems = computed(() => themeProblems(this.name()));

  constructor() {
    // A subscription rather than an effect: it writes the stylesheet before
    // the first render, on the server too, so the sheet never shows the
    // harness's own theme first.
    this.route.paramMap
      .pipe(
        map((params) => params.get('name') ?? ''),
        takeUntilDestroyed(),
      )
      .subscribe((name) => {
        const theme = THEMES[name];
        this.writeStyle(theme ? themeSheetCss(name, theme.vars) : '');
        for (const problem of themeProblems(name)) {
          console.error(problem);
        }
      });
    inject(DestroyRef).onDestroy(() =>
      this.document.getElementById(STYLE_ID)?.remove(),
    );
  }

  /**
   * Puts the theme's stylesheet in the document head, reusing the element
   * the server rendered.
   *
   * @param css - Stylesheet text.
   */
  private writeStyle(css: string): void {
    let style = this.document.getElementById(STYLE_ID);
    if (!style) {
      style = this.renderer.createElement('style') as HTMLStyleElement;
      this.renderer.setAttribute(style, 'id', STYLE_ID);
      this.renderer.appendChild(this.document.head, style);
    }
    style.textContent = css;
  }
}
