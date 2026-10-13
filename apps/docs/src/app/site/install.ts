import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';

/** Chrome's `beforeinstallprompt` event, which the DOM types leave out. */
export interface InstallPromptEvent extends Event {
  /** Shows the browser's install dialog; callable once. */
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    /** Kept by the `index.html` script when Chrome offers installation. */
    ndopInstallPrompt?: InstallPromptEvent;
  }
}

/** Storage keys: visits so far, and a dismissed iOS hint. */
const VISITS = 'ndop-visits';
const HINT = 'ndop-install-hint';

/**
 * Offering to install the docs as an app (ADR-0027). Chrome and Android
 * fire `beforeinstallprompt`, which `index.html` keeps from the moment the
 * page loads, so `available` holds even when it fired before the app
 * booted; `install()` shows the browser's dialog. iOS Safari has no
 * prompt, so readers there get a hint, from their second visit until they
 * dismiss it.
 */
@Injectable({ providedIn: 'root' })
export class InstallApp {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly prompt = signal<InstallPromptEvent | undefined>(undefined);
  private readonly hint = signal(false);

  /** Whether the browser offers installation now. */
  readonly available = computed(() => this.prompt() !== undefined);

  /** Whether to show the iOS "Add to Home Screen" hint. */
  readonly iosHint = this.hint.asReadonly();

  constructor() {
    if (!this.browser) return;
    const offer = () => this.prompt.set(window.ndopInstallPrompt);
    offer();
    addEventListener('ndop:installable', offer);
    addEventListener('appinstalled', () => {
      window.ndopInstallPrompt = undefined;
      offer();
    });
    this.hint.set(
      this.countVisit() >= 2 && this.read(HINT) === null && isIosSafari(),
    );
  }

  /**
   * Shows the browser's install dialog. A prompt can be shown once, so the
   * offer goes away whatever the reader picks; Chrome offers again later
   * if they declined.
   */
  async install(): Promise<void> {
    const event = this.prompt();
    if (!event) return;
    window.ndopInstallPrompt = undefined;
    this.prompt.set(undefined);
    await event.prompt();
  }

  /** Hides the iOS hint for good. */
  dismissHint(): void {
    this.hint.set(false);
    this.write(HINT, 'dismissed');
  }

  /**
   * Counts this visit, once per browser session.
   *
   * @returns Visits so far, this one included.
   */
  private countVisit(): number {
    const visits = Number(this.read(VISITS)) || 0;
    try {
      if (sessionStorage.getItem(VISITS)) return visits;
      sessionStorage.setItem(VISITS, '1');
    } catch {
      return visits;
    }
    this.write(VISITS, String(visits + 1));
    return visits + 1;
  }

  /**
   * Reads a saved value.
   *
   * @param key - Storage key.
   * @returns The value, or `null` when unset or storage is unavailable.
   */
  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Saves a value; private windows may refuse, which only shows the hint
   * again next visit.
   *
   * @param key - Storage key.
   * @param value - Value.
   */
  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage is unavailable; nothing is remembered.
    }
  }
}

/**
 * Whether this is Safari on an iPhone or iPad, outside an installed app.
 * Other iOS browsers name themselves in the user agent, and iPads present
 * themselves as Macs with touch.
 *
 * @returns `true` in iOS Safari's browser tabs.
 */
export function isIosSafari(): boolean {
  const agent = navigator.userAgent;
  const ios =
    /iPhone|iPad|iPod/.test(agent) ||
    (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
  const safari =
    /Safari\//.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(agent);
  const standalone =
    (navigator as { standalone?: boolean }).standalone === true ||
    matchMedia('(display-mode: standalone)').matches;
  return ios && safari && !standalone;
}
