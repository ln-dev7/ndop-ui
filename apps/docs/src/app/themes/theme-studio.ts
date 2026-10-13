import { DOCUMENT, isPlatformBrowser, Location } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import {
  COLOR_TOKENS,
  encodeTheme,
  fontOf,
  parseColor,
  THEME_FONTS,
  themeContrast,
  toHex,
  type Oklch,
  type ThemeVars,
} from '@ndop/schema/theme';
import { Button } from '@/ui/button/button';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import {
  Slider,
  SliderRange,
  SliderThumb,
  SliderTrack,
} from '@/ui/slider/slider';
import { themes } from 'virtual:ndop/themes';
import { fitFrameToContent } from '../site/frame-height';
import { Preferences } from '../site/preferences';
import {
  applyTheme,
  DENSITIES,
  densityOf,
  initialTheme,
  normalizeTheme,
  radiusOf,
  removeTheme,
  setColor,
  setDensity,
  setFont,
  setRadius,
  type ThemeMode,
} from './studio-theme';
import { ThemeExports } from './theme-exports';

/** How long the URL waits for edits to stop before it follows them. */
const URL_DELAY = 300;

/** A native `<select>` in the registry's input style. */
const SELECT =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

/** An OKLCH channel the sliders edit. */
interface Channel {
  /** Which one. */
  key: 'l' | 'c' | 'h';
  /** Its slider's name. */
  label: string;
  /** Least value. */
  min: number;
  /** Greatest value. */
  max: number;
  /** Step of the arrow keys. */
  step: number;
}

/** Lightness, chroma and hue, with sRGB's range of chroma and some room. */
const CHANNELS: readonly Channel[] = [
  { key: 'l', label: 'Lightness', min: 0, max: 1, step: 0.005 },
  { key: 'c', label: 'Chroma', min: 0, max: 0.4, step: 0.001 },
  { key: 'h', label: 'Hue', min: 0, max: 360, step: 1 },
];

/**
 * The theme studio, `/themes/studio` (ADR-0023): edits every color token
 * in light and dark (OKLCH sliders and a hex field), the radius, the fonts
 * and the density, with the contrast of every foreground and background
 * pair; applies the theme to the whole site and to a sample dashboard as
 * it changes; keeps it in the URL; and exports it.
 *
 * It edits the mode the site shows, and its mode switch is the site's.
 * The theme applies to the site only while the studio is open: leaving it
 * restores the site's own theme, so a visit can't leave the docs in a
 * half-edited theme, and a link brings the theme back.
 */
@Component({
  selector: 'docs-theme-studio',
  imports: [
    RouterLink,
    NdIcon,
    Button,
    Input,
    Label,
    Slider,
    SliderRange,
    SliderThumb,
    SliderTrack,
    ThemeExports,
  ],
  host: { class: 'block' },
  template: `
    <!-- Named, so it stays distinct from the sample dashboard's own main
         landmark in the frame below. -->
    <main
      id="main"
      aria-labelledby="studio-title"
      class="mx-auto max-w-[1440px] px-4 py-10 lg:px-6"
    >
      <p class="text-sm">
        <a
          routerLink="/themes"
          class="text-muted-foreground hover:text-foreground"
          >Themes</a
        >
      </p>
      <h1 id="studio-title" class="mt-2 text-3xl font-semibold tracking-tight">
        Theme studio
      </h1>
      <p class="mt-2 max-w-2xl text-muted-foreground">
        Edit the tokens and watch the whole site and the dashboard below follow.
        The link keeps your theme; export it when you're done.
      </p>
      @if (problem(); as message) {
        <p role="alert" class="mt-4 text-sm text-destructive">
          This link's theme couldn't be read: {{ message }}
        </p>
      }

      <div class="mt-8 grid gap-10 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <!-- Grid items default to their content's width, which the token
             rows and sliders exceed; they shrink to the column instead. -->
        <div class="grid min-w-0 content-start gap-8 *:min-w-0 *:grid-cols-1">
          <section aria-labelledby="studio-start" class="grid gap-3">
            <h2 id="studio-start" class="text-lg font-semibold">Theme</h2>
            <div class="grid gap-2">
              <label ndLabel for="studio-from">Start from</label>
              <select
                id="studio-from"
                [class]="select"
                (change)="startFrom(value($event))"
              >
                @if (!from()) {
                  <option value="" selected>Your theme</option>
                }
                @for (theme of themes; track theme.name) {
                  <option
                    [value]="theme.name"
                    [selected]="theme.name === from()"
                  >
                    {{ theme.title }}
                  </option>
                }
              </select>
            </div>
            <div
              role="group"
              aria-label="Mode"
              class="inline-flex w-fit gap-1 rounded-lg border p-1"
            >
              @for (option of modes; track option.mode) {
                <button
                  ndButton
                  variant="ghost"
                  size="sm"
                  class="aria-pressed:bg-muted"
                  [attr.aria-pressed]="option.mode === mode()"
                  (click)="showMode(option.mode)"
                >
                  <svg [ndIcon]="option.icon"></svg>
                  {{ option.label }}
                </button>
              }
            </div>
          </section>

          <section aria-labelledby="studio-colors" class="grid gap-3">
            <h2 id="studio-colors" class="text-lg font-semibold">
              Colors <span class="sr-only">({{ mode() }})</span>
            </h2>
            <div
              class="grid gap-4 rounded-xl border p-4"
              aria-labelledby="studio-selected"
              role="group"
            >
              <div class="flex items-center gap-3">
                <span
                  class="size-8 shrink-0 rounded-md border"
                  [style.background]="selectedValue()"
                ></span>
                <h3 id="studio-selected" class="font-mono text-sm font-medium">
                  {{ selected() }}
                </h3>
              </div>
              @for (channel of channels; track channel.key) {
                <div class="grid gap-2">
                  <div class="flex justify-between text-sm">
                    <span [id]="'studio-' + channel.key">{{
                      channel.label
                    }}</span>
                    <span class="font-mono text-muted-foreground">{{
                      format(selectedColor()[channel.key], channel)
                    }}</span>
                  </div>
                  <div
                    ndSlider
                    [min]="channel.min"
                    [max]="channel.max"
                    [step]="channel.step"
                  >
                    <div ndSliderTrack><div ndSliderRange></div></div>
                    <span
                      ndSliderThumb
                      [attr.aria-labelledby]="'studio-' + channel.key"
                      [valueText]="
                        format(selectedColor()[channel.key], channel)
                      "
                      [value]="selectedColor()[channel.key]"
                      (valueChange)="setChannel(channel.key, $event)"
                    ></span>
                  </div>
                </div>
              }
            </div>
            <ul class="grid grid-cols-1 gap-1" aria-label="Color tokens">
              @for (token of tokens; track token) {
                <li class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-start text-sm hover:bg-muted aria-pressed:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    [attr.aria-pressed]="token === selected()"
                    (click)="selected.set(token)"
                  >
                    <span
                      class="size-5 shrink-0 rounded border"
                      [style.background]="colorValue(token)"
                    ></span>
                    <span class="truncate font-mono text-xs">{{ token }}</span>
                  </button>
                  <input
                    ndInput
                    class="h-8 w-28 font-mono text-xs"
                    spellcheck="false"
                    autocomplete="off"
                    [attr.aria-label]="token + ' hex'"
                    [attr.data-token]="token"
                    [value]="hex(token)"
                    (change)="setHex(token, $event)"
                    (keydown.enter)="setHex(token, $event)"
                  />
                </li>
              }
            </ul>
          </section>

          <section aria-labelledby="studio-contrast" class="grid gap-3">
            <h2 id="studio-contrast" class="text-lg font-semibold">
              Contrast <span class="sr-only">({{ mode() }})</span>
            </h2>
            <p class="text-sm text-muted-foreground">
              WCAG 2 ratios: text needs 4.5:1, and lines and charts 3:1.
              @if (failing()) {
                {{ failing() }} {{ failing() === 1 ? 'pair is' : 'pairs are' }}
                under.
              }
            </p>
            <ul class="grid grid-cols-1 gap-1 text-sm">
              @for (
                result of contrast();
                track result.foreground + result.background
              ) {
                <li
                  class="flex items-center gap-2"
                  [attr.data-pair]="result.foreground + ':' + result.background"
                  [attr.data-ok]="result.ok"
                >
                  <!-- Shapes, not text, so the page's own contrast checks
                       don't flag the pairs it exists to show. -->
                  <span
                    class="flex size-6 shrink-0 items-center justify-center rounded border"
                    [style.background]="colorValue(result.background)"
                  >
                    <span
                      class="h-1.5 w-3.5 rounded-full"
                      [style.background]="colorValue(result.foreground)"
                    ></span>
                  </span>
                  <span class="min-w-0 flex-1 truncate font-mono text-xs"
                    >{{ result.foreground }} on {{ result.background }}</span
                  >
                  <span class="font-mono text-xs">{{
                    ratio(result.ratio)
                  }}</span>
                  @if (!result.ok) {
                    <span
                      class="flex items-center gap-1 text-xs text-destructive"
                    >
                      <svg ndIcon="triangle-alert" class="size-3.5"></svg>
                      Needs {{ result.min }}:1
                    </span>
                  }
                </li>
              }
            </ul>
          </section>

          <section aria-labelledby="studio-shape" class="grid gap-4">
            <h2 id="studio-shape" class="text-lg font-semibold">
              Radius, fonts and density
            </h2>
            <div class="grid gap-2">
              <div class="flex justify-between text-sm">
                <span id="studio-radius">Radius</span>
                <span class="font-mono text-muted-foreground"
                  >{{ radius() }}rem</span
                >
              </div>
              <div ndSlider [min]="0" [max]="1.5" [step]="0.025">
                <div ndSliderTrack><div ndSliderRange></div></div>
                <span
                  ndSliderThumb
                  aria-labelledby="studio-radius"
                  [valueText]="radius() + 'rem'"
                  [value]="radius()"
                  (valueChange)="edit(setRadius(vars(), $event))"
                ></span>
              </div>
            </div>
            <div class="grid gap-2">
              <label ndLabel for="studio-sans">Sans font</label>
              <select
                id="studio-sans"
                [class]="select"
                (change)="setFontById(value($event))"
              >
                @for (font of sansFonts; track font.id) {
                  <option [value]="font.id" [selected]="font.id === sans()">
                    {{ font.name }}
                  </option>
                }
              </select>
            </div>
            <div class="grid gap-2">
              <label ndLabel for="studio-mono">Mono font</label>
              <select
                id="studio-mono"
                [class]="select"
                (change)="setFontById(value($event))"
              >
                @for (font of monoFonts; track font.id) {
                  <option [value]="font.id" [selected]="font.id === mono()">
                    {{ font.name }}
                  </option>
                }
              </select>
            </div>
            <div class="grid gap-2">
              <span id="studio-density" class="text-sm font-medium"
                >Density</span
              >
              <div
                role="group"
                aria-labelledby="studio-density"
                class="inline-flex w-fit gap-1 rounded-lg border p-1"
              >
                @for (option of densities; track option.id) {
                  <button
                    ndButton
                    variant="ghost"
                    size="sm"
                    class="aria-pressed:bg-muted"
                    [attr.aria-pressed]="option.id === density()"
                    (click)="edit(setDensity(vars(), option.id))"
                  >
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
          </section>
        </div>

        <div class="grid min-w-0 content-start gap-10">
          <section aria-labelledby="studio-preview" class="grid gap-3">
            <h2 id="studio-preview" class="text-lg font-semibold">
              Sample dashboard
            </h2>
            <div class="overflow-hidden rounded-xl border bg-muted/40">
              <!-- Made in the browser only: hydration sets an iframe's src
                   again, which Firefox and Safari take as a new
                   navigation, cancelling the dashboard's scripts. -->
              @if (mounted()) {
                <iframe
                  class="block w-full bg-background"
                  [style.height.px]="frameHeight()"
                  src="/blocks/dashboard-01/preview"
                  title="Sample dashboard in your theme"
                  (load)="frameLoaded($event)"
                ></iframe>
              } @else {
                <div
                  class="w-full bg-background"
                  [style.height.px]="frameHeight()"
                ></div>
              }
            </div>
          </section>

          <section aria-labelledby="studio-export" class="grid gap-3">
            <h2 id="studio-export" class="text-lg font-semibold">Export</h2>
            <docs-theme-exports [vars]="vars()" />
          </section>
        </div>
      </div>
    </main>
  `,
})
export class ThemeStudio {
  private readonly preferences = inject(Preferences);
  private readonly document = inject(DOCUMENT);
  private readonly location = inject(Location);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly themes = themes;
  protected readonly tokens = COLOR_TOKENS;
  protected readonly channels = CHANNELS;
  protected readonly densities = DENSITIES;
  protected readonly select = SELECT;
  protected readonly sansFonts = THEME_FONTS.filter(
    (font) => font.role === 'sans',
  );
  protected readonly monoFonts = THEME_FONTS.filter(
    (font) => font.role === 'mono',
  );
  protected readonly modes = [
    { mode: 'light', label: 'Light', icon: 'sun' },
    { mode: 'dark', label: 'Dark', icon: 'moon' },
  ] as const;

  /** The theme being edited. */
  protected readonly vars = signal<ThemeVars>(initialTheme({}, themes).vars);
  /** The gallery theme it is, until it's edited. */
  protected readonly from = signal<string | undefined>(
    initialTheme({}, themes).from,
  );
  /** Why the link's theme was refused. */
  protected readonly problem = signal<string | undefined>(undefined);
  /** The token the sliders edit. */
  protected readonly selected = signal<string>('primary');
  /** Whether the reader changed anything, so the URL should follow. */
  private readonly edited = signal(false);

  private readonly systemDark = signal(false);
  private readonly frameDocument = signal<Document | undefined>(undefined);

  protected readonly frameHeight = signal(720);

  private stopFitting: (() => void) | undefined;

  /** Whether the first render in the browser has happened. */
  protected readonly mounted = signal(false);

  /** The mode the site shows, which is the one being edited. */
  protected readonly mode = computed<ThemeMode>(() => {
    const mode = this.preferences.mode();
    if (mode === 'system') return this.systemDark() ? 'dark' : 'light';
    return mode;
  });

  protected readonly selectedValue = computed(() =>
    this.colorValue(this.selected()),
  );
  protected readonly selectedColor = computed<Oklch>(
    () =>
      parseColor(this.selectedValue() ?? '') ?? { l: 0, c: 0, h: 0, alpha: 1 },
  );

  protected readonly contrast = computed(() =>
    themeContrast(this.vars()).filter((result) => result.mode === this.mode()),
  );
  protected readonly failing = computed(
    () => this.contrast().filter((result) => !result.ok).length,
  );

  protected readonly radius = computed(() => radiusOf(this.vars()));
  protected readonly density = computed(() => densityOf(this.vars()));
  protected readonly sans = computed(
    () => fontOf(this.vars().theme['font-sans'])?.id ?? 'geist',
  );
  protected readonly mono = computed(
    () => fontOf(this.vars().theme['font-mono'])?.id ?? 'geist-mono',
  );

  protected readonly setRadius = setRadius;
  protected readonly setDensity = setDensity;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.stopFitting?.());
    inject(Title).setTitle('Theme studio · Ndop UI');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Make an Ndop UI theme: edit its colors in OKLCH with contrast checks, its radius, fonts and density, and export it as CSS, a theme URL or design tokens.',
    });

    // The URL is read once the page has hydrated, so the server's render,
    // which never sees the query, and the browser's first one match.
    afterNextRender(() => {
      const params = new URLSearchParams(location.search);
      const start = initialTheme(
        { t: params.get('t'), from: params.get('from') },
        themes,
      );
      this.vars.set(start.vars);
      this.from.set(start.from);
      this.problem.set(start.problem);

      this.mounted.set(true);

      const query = matchMedia('(prefers-color-scheme: dark)');
      const follow = (event: { matches: boolean }) =>
        this.systemDark.set(event.matches);
      follow(query);
      query.addEventListener('change', follow);
      destroyRef.onDestroy(() => query.removeEventListener('change', follow));
    });

    effect(() => {
      const vars = this.vars();
      if (this.browser) applyTheme(this.document, vars);
    });
    effect(() => {
      const frame = this.frameDocument();
      if (frame) applyTheme(frame, this.vars());
    });
    effect((onCleanup) => {
      if (!this.edited()) return;
      const query = `t=${encodeTheme(this.vars())}`;
      const timer = setTimeout(
        () => this.location.replaceState('/themes/studio', query),
        URL_DELAY,
      );
      onCleanup(() => clearTimeout(timer));
    });

    destroyRef.onDestroy(() => {
      if (this.browser) removeTheme(this.document);
    });
  }

  /**
   * Replaces the theme with an edited one.
   *
   * @param vars - The new theme.
   */
  protected edit(vars: ThemeVars): void {
    this.vars.set(vars);
    this.from.set(undefined);
    this.edited.set(true);
  }

  /**
   * Starts again from a gallery theme.
   *
   * @param name - The theme's name.
   */
  protected startFrom(name: string): void {
    const theme = themes.find((entry) => entry.name === name);
    if (!theme) return;
    this.vars.set(normalizeTheme(theme.vars));
    this.from.set(name);
    this.problem.set(undefined);
    this.edited.set(true);
  }

  /**
   * Shows the site in light or dark, which is the mode the studio edits.
   *
   * @param mode - The mode.
   */
  protected showMode(mode: ThemeMode): void {
    this.preferences.setMode(mode);
  }

  /**
   * A token's value in the mode being edited; dark falls back to light,
   * as in CSS.
   *
   * @param token - The token.
   * @returns The CSS value, if the theme sets one.
   */
  protected colorValue(token: string): string | undefined {
    const vars = this.vars();
    return vars[this.mode()][token] ?? vars.light[token];
  }

  /**
   * A token's color as hex, for its field.
   *
   * @param token - The token.
   * @returns The hex code, or nothing for an unset or unreadable value.
   */
  protected hex(token: string): string {
    const color = parseColor(this.colorValue(token) ?? '');
    return color ? toHex(color) : '';
  }

  /**
   * Sets a token from its field: hex, or any color `parseColor` reads. A
   * hex code has no alpha, so a translucent token keeps its own. Anything
   * unreadable puts the field back.
   *
   * @param token - The token.
   * @param event - The field's change or Enter.
   */
  protected setHex(token: string, event: Event): void {
    const field = event.target as HTMLInputElement;
    const color = parseColor(field.value);
    if (!color) {
      field.value = this.hex(token);
      return;
    }
    if (field.value.trim() === this.hex(token)) return;
    const current = parseColor(this.colorValue(token) ?? '');
    const alpha =
      /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(field.value.trim()) && current
        ? current.alpha
        : color.alpha;
    this.selected.set(token);
    this.edit(setColor(this.vars(), this.mode(), token, { ...color, alpha }));
  }

  /**
   * Sets one channel of the selected token's color.
   *
   * @param channel - Lightness, chroma or hue.
   * @param value - The slider's value.
   */
  protected setChannel(channel: Channel['key'], value: number): void {
    const color = this.selectedColor();
    if (color[channel] === value) return;
    this.edit(
      setColor(this.vars(), this.mode(), this.selected(), {
        ...color,
        [channel]: value,
      }),
    );
  }

  /**
   * Sets the sans or mono font.
   *
   * @param id - The font's id in `THEME_FONTS`.
   */
  protected setFontById(id: string): void {
    const font = THEME_FONTS.find((entry) => entry.id === id);
    if (font) this.edit(setFont(this.vars(), font));
  }

  /**
   * Applies the theme to the sample dashboard once its page loads, and
   * keeps the frame as tall as the dashboard, so the wheel scrolls the
   * studio. The page is on the site's own origin, so its document is
   * reachable.
   *
   * @param event - The frame's load event.
   */
  protected frameLoaded(event: Event): void {
    const frame = event.target as HTMLIFrameElement;
    const page = frame.contentDocument;
    if (page) this.frameDocument.set(page);
    this.stopFitting?.();
    this.stopFitting = fitFrameToContent(frame, 720, (height) =>
      this.frameHeight.set(height),
    );
  }

  /**
   * A channel's value as the sliders show it.
   *
   * @param value - The value.
   * @param channel - Its channel.
   * @returns The text.
   */
  protected format(value: number, channel: Channel): string {
    return channel.key === 'h' ? `${Math.round(value)}°` : value.toFixed(3);
  }

  /**
   * A contrast ratio as text.
   *
   * @param ratio - The ratio, if both colors could be read.
   * @returns Such as `4.54:1`.
   */
  protected ratio(ratio: number | undefined): string {
    return ratio === undefined ? 'n/a' : `${ratio.toFixed(2)}:1`;
  }

  /**
   * The value of the control an event came from.
   *
   * @param event - A change event.
   * @returns Its value.
   */
  protected value(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}
