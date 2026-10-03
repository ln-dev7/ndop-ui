import {
  Directive,
  effect,
  ElementRef,
  HostAttributeToken,
  inject,
  InjectionToken,
  input,
  isDevMode,
  makeEnvironmentProviders,
  Renderer2,
  type EnvironmentProviders,
} from '@angular/core';

/**
 * One SVG element of an icon: tag name, attributes, and optional children.
 * The same node format Lucide uses, so its icon data plugs in directly
 * (ADR-0013).
 */
export type NdIconNode = readonly [
  tag: string,
  attributes: Readonly<Record<string, string | number>>,
  children?: readonly NdIconNode[],
];

/**
 * The drawing of one icon.
 */
export interface NdIconData {
  /** Child elements of the `svg`. */
  readonly node: readonly NdIconNode[];
  /** Width and height of the icon's coordinate system. Defaults to 24. */
  readonly size?: number;
}

/**
 * Icons available to {@link NdIcon}, keyed by semantic name (`x`,
 * `chevron-down`, `check`).
 */
export type NdIcons = Readonly<Record<string, NdIconData>>;

/**
 * The registered icons. Empty until {@link provideNdopIcons} is used.
 */
export const ND_ICONS = new InjectionToken<NdIcons>('ND_ICONS', {
  providedIn: 'root',
  factory: () => ({}),
});

/**
 * Registers the icons styled items ask for by semantic name. `ndop init`
 * writes a `{lib}/icons.ts` that maps Ndop's names to Lucide icons and calls
 * this; swapping icon libraries means editing that one file.
 *
 * @param icons - Icon data by semantic name.
 * @returns Providers for `bootstrapApplication` or `ApplicationConfig`.
 *
 * @example
 * ```ts
 * import { LucideX } from '@lucide/angular';
 * providers: [provideNdopIcons({ x: LucideX.icon })];
 * ```
 */
export function provideNdopIcons(icons: NdIcons): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ND_ICONS, useValue: icons }]);
}

/**
 * Namespace of the host `svg`. The host attributes below are Lucide's
 * defaults, so icons look the same whether they come through Ndop or
 * straight from `@lucide/angular`.
 */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Renders a registered icon into the host `svg` by semantic name. Size and
 * color come from classes (`class="size-4"`); the stroke follows
 * `currentColor`. The icon is hidden from assistive technology unless the
 * `svg` has an `aria-label` or `aria-labelledby`, in which case it gets
 * `role="img"`. The directive owns the `svg`'s children.
 *
 * @example
 * ```html
 * <svg ndIcon="x" class="size-4"></svg>
 * ```
 */
@Directive({
  selector: 'svg[ndIcon]',
  host: {
    xmlns: SVG_NAMESPACE,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    '[attr.width]': 'size',
    '[attr.height]': 'size',
    '[attr.viewBox]': '"0 0 " + size + " " + size',
    '[attr.aria-hidden]': 'labelled ? null : "true"',
    '[attr.role]': 'labelled ? "img" : null',
  },
})
export class NdIcon {
  /** Semantic name of the icon to render. */
  readonly ndIcon = input.required<string>();

  /** Width and height of the drawing's coordinate system. */
  protected size = 24;

  /** Whether the icon has an accessible name of its own. */
  protected readonly labelled =
    inject(new HostAttributeToken('aria-label'), { optional: true }) !== null ||
    inject(new HostAttributeToken('aria-labelledby'), { optional: true }) !==
      null;

  private readonly icons = inject(ND_ICONS);
  private readonly renderer = inject(Renderer2);
  private readonly host: SVGElement = inject(ElementRef).nativeElement;

  constructor() {
    effect(() => this.render(this.ndIcon()));
  }

  /**
   * Replaces the `svg`'s children with the named icon's drawing.
   *
   * @param name - Semantic icon name.
   */
  private render(name: string): void {
    // Clear everything, including nodes rendered on the server: they aren't
    // part of any template, so hydration leaves them in place.
    for (const child of Array.from(this.host.childNodes)) {
      this.renderer.removeChild(this.host, child);
    }
    const icon = this.icons[name];
    if (!icon) {
      if (isDevMode()) {
        console.warn(
          `NdIcon: no icon named "${name}". Register it with provideNdopIcons().`,
        );
      }
      return;
    }
    this.size = icon.size ?? 24;
    for (const node of icon.node) {
      this.renderer.appendChild(this.host, this.create(node));
    }
  }

  /**
   * Creates one SVG element and its children.
   *
   * @param node - The node to create.
   * @returns The element.
   */
  private create(node: NdIconNode): Element {
    const [tag, attributes, children = []] = node;
    const element = this.renderer.createElement(tag, 'svg') as Element;
    for (const [name, value] of Object.entries(attributes)) {
      // Lucide's nodes carry a React-style `key`, which isn't an SVG
      // attribute.
      if (name !== 'key') {
        this.renderer.setAttribute(element, name, String(value));
      }
    }
    for (const child of children) {
      this.renderer.appendChild(element, this.create(child));
    }
    return element;
  }
}
