import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { NdopTheme, type NdopThemeMode } from '@ndop/core';

/**
 * The browser's and the installed app's bar color in each scheme, as
 * `index.html` sets it: the brand's indigo, or the dark header's
 * background (ADR-0027).
 */
const BAR_COLORS = { light: '#1E3170', dark: '#0a0a0a' } as const;

/** Text direction of the whole site. */
export type Direction = 'ltr' | 'rtl';

/**
 * The reader's site-wide color scheme and text direction. Both are saved in
 * `localStorage` and applied before the first paint by a script in
 * `index.html`; this service reads them back on boot and keeps them in sync.
 */
@Injectable({ providedIn: 'root' })
export class Preferences {
  private readonly theme = inject(NdopTheme);
  private readonly document = inject(DOCUMENT);
  private readonly root = this.document.documentElement;
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly currentDirection = signal<Direction>('ltr');
  private readonly directionality = inject(Directionality);

  /** The color scheme: light, dark, or the operating system's. */
  readonly mode = this.theme.mode;

  /** The site's text direction. */
  readonly direction = this.currentDirection.asReadonly();

  /**
   * Re-applies the saved preferences in the browser. The page already shows
   * them, from the `index.html` script; `NdopTheme` resets the scheme to
   * its configured default when it starts, so it is set again here.
   */
  restore(): void {
    if (!this.browser) return;
    const saved = this.read('ndop-theme');
    if (saved === 'light' || saved === 'dark') this.theme.set(saved);
    this.paintBars();
    this.applyDirection(this.root.dir === 'rtl' ? 'rtl' : 'ltr');
  }

  /**
   * Switches and saves the color scheme.
   *
   * @param mode - The scheme.
   */
  setMode(mode: NdopThemeMode): void {
    this.theme.set(mode);
    this.paintBars();
    this.write('ndop-theme', mode);
  }

  /**
   * Switches between light and dark from whichever shows now, including
   * the operating system's scheme in system mode, and saves the choice.
   */
  toggleDark(): void {
    const dark =
      this.root.classList.contains('dark') ||
      (this.mode() === 'system' &&
        matchMedia('(prefers-color-scheme: dark)').matches);
    this.setMode(dark ? 'light' : 'dark');
  }

  /**
   * Follows the preferences another page of the site saves, such as the
   * gallery around a block's preview frame (ADR-0022): same-origin pages
   * hear each other's `localStorage` writes through `storage` events.
   */
  follow(): void {
    if (!this.browser) return;
    addEventListener('storage', (event) => {
      if (event.key === 'ndop-theme') {
        const mode = event.newValue;
        this.theme.set(mode === 'light' || mode === 'dark' ? mode : 'system');
        this.paintBars();
      } else if (event.key === 'ndop-dir') {
        const direction = event.newValue === 'rtl' ? 'rtl' : 'ltr';
        this.root.dir = direction;
        this.applyDirection(direction);
      }
    });
  }

  /**
   * Switches and saves the text direction.
   *
   * @param direction - The direction.
   */
  setDirection(direction: Direction): void {
    this.root.dir = direction;
    this.applyDirection(direction);
    this.write('ndop-dir', direction);
  }

  /**
   * Tells the app the direction changed. The CDK reads `<html dir>` only
   * when it starts, so its root `Directionality`, which overlays and
   * keyboard handling follow, is updated here too.
   *
   * @param direction - The direction.
   */
  private applyDirection(direction: Direction): void {
    this.currentDirection.set(direction);
    if (this.directionality.value !== direction) {
      this.directionality.valueSignal.set(direction);
      this.directionality.change.emit(direction);
    }
  }

  /**
   * Gives the browser's bars the scheme the site shows: by default each
   * `theme-color` tag applies under its own system scheme, but a scheme
   * chosen on the site holds under both.
   */
  private paintBars(): void {
    if (!this.browser) return;
    const mode = this.mode();
    for (const meta of this.document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )) {
      const scheme = meta.media.includes('dark') ? 'dark' : 'light';
      meta.content = BAR_COLORS[mode === 'system' ? scheme : mode];
    }
  }

  /**
   * Reads a saved value.
   *
   * @param key - Storage key.
   * @returns The value, or `null` when storage is unavailable.
   */
  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Saves a value; private windows may refuse, which only loses the
   * preference.
   *
   * @param key - Storage key.
   * @param value - Value.
   */
  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage is unavailable; the choice applies to this visit only.
    }
  }
}
