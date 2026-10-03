import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { NdopTheme, type NdopThemeMode } from '@ndop/core';

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
  private readonly root = inject(DOCUMENT).documentElement;
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
    this.applyDirection(this.root.dir === 'rtl' ? 'rtl' : 'ltr');
  }

  /**
   * Switches and saves the color scheme.
   *
   * @param mode - The scheme.
   */
  setMode(mode: NdopThemeMode): void {
    this.theme.set(mode);
    this.write('ndop-theme', mode);
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
