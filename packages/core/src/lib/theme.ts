import {
  DOCUMENT,
  Injectable,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  signal,
  type EnvironmentProviders,
} from '@angular/core';

/**
 * Color scheme mode. `system` follows the operating system's preference,
 * resolved in CSS so server-rendered pages show the right theme before
 * hydration (ADR-0006).
 */
export type NdopThemeMode = 'system' | 'light' | 'dark';

/**
 * Options for {@link provideNdop}.
 */
export interface NdopConfig {
  /** Initial color scheme. Defaults to `system`. */
  theme?: NdopThemeMode;
}

/**
 * The resolved Ndop configuration, provided by {@link provideNdop}.
 */
export const ND_CONFIG = new InjectionToken<Required<NdopConfig>>('ND_CONFIG');

/**
 * Attribute that tells Ndop's CSS to follow `prefers-color-scheme`.
 */
const SYSTEM_ATTRIBUTE = 'data-ndop-theme';

/**
 * Reads and changes the color scheme at runtime. It writes to the document
 * root, through the injected `DOCUMENT`, so it works the same during SSR:
 * `dark` adds the `dark` class, `system` sets `data-ndop-theme="system"`,
 * and `light` sets neither.
 *
 * @example
 * ```ts
 * readonly theme = inject(NdopTheme);
 * toggle() {
 *   this.theme.set(this.theme.mode() === 'dark' ? 'light' : 'dark');
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class NdopTheme {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly current = signal<NdopThemeMode>(
    inject(ND_CONFIG, { optional: true })?.theme ?? 'system',
  );

  /** The active mode. */
  readonly mode = this.current.asReadonly();

  constructor() {
    this.apply(this.current());
  }

  /**
   * Switches the color scheme.
   *
   * @param mode - The mode to apply.
   */
  set(mode: NdopThemeMode): void {
    this.current.set(mode);
    this.apply(mode);
  }

  /**
   * Writes a mode to the document root.
   *
   * @param mode - The mode to apply.
   */
  private apply(mode: NdopThemeMode): void {
    this.root.classList.toggle('dark', mode === 'dark');
    if (mode === 'system') {
      this.root.setAttribute(SYSTEM_ATTRIBUTE, 'system');
    } else {
      this.root.removeAttribute(SYSTEM_ATTRIBUTE);
    }
  }
}

/**
 * Configures Ndop for an application: registers the configuration and
 * applies the initial color scheme to the document root at startup, on the
 * server as well as in the browser.
 *
 * @param config - Ndop options.
 * @returns Providers for `bootstrapApplication` or `ApplicationConfig`.
 *
 * @example
 * ```ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [provideNdop({ theme: 'system' })],
 * };
 * ```
 */
export function provideNdop(config: NdopConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ND_CONFIG, useValue: { theme: config.theme ?? 'system' } },
    provideEnvironmentInitializer(() => inject(NdopTheme)),
  ]);
}
