import {
  booleanAttribute,
  computed,
  Directive,
  HostAttributeToken,
  inject,
  InjectionToken,
  input,
  model,
  signal,
  type OnInit,
} from '@angular/core';
import { injectId } from '@ndop/primitives/internal';

/**
 * The enclosing {@link NdCollapsible}, injected by its parts.
 */
export const ND_COLLAPSIBLE = new InjectionToken<NdCollapsible>(
  'ND_COLLAPSIBLE',
);

/**
 * Root of a collapsible: a trigger that shows and hides a section of
 * content, the WAI-ARIA disclosure pattern. It holds the open state, which
 * renders on the server too, since the content stays in the page.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 *
 * @example
 * ```html
 * <div ndCollapsible [(open)]="showMore">
 *   <button ndCollapsibleTrigger>Show more</button>
 *   <div ndCollapsibleContent>…</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndCollapsible]',
  exportAs: 'ndCollapsible',
  providers: [{ provide: ND_COLLAPSIBLE, useExisting: NdCollapsible }],
  host: {
    '[attr.data-state]': 'state()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class NdCollapsible implements OnInit {
  /** Whether the content is shown. Two-way bindable with `[(open)]`. */
  readonly open = model(false);

  /** Initial open state when `open` is not bound. */
  readonly defaultOpen = input(false, { transform: booleanAttribute });

  /** Stops the trigger from toggling the content. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Id of the content element, for the trigger's `aria-controls`. */
  readonly contentId = signal(injectId('nd-collapsible-content'));

  /** `open` or `closed`, for `data-state`. */
  readonly state = computed(() => (this.open() ? 'open' : 'closed'));

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // initial state and hydration finds the same markup.
    if (this.defaultOpen()) {
      this.open.set(true);
    }
  }

  /** Shows the content if hidden, or hides it if shown, unless disabled. */
  toggle(): void {
    if (!this.disabled()) {
      this.open.update((open) => !open);
    }
  }
}

/**
 * The button that shows and hides a {@link NdCollapsible}'s content. Use a
 * native `button`, so Enter and Space activate it.
 *
 * @example
 * ```html
 * <button ndCollapsibleTrigger>Show more</button>
 * ```
 */
@Directive({
  selector: 'button[ndCollapsibleTrigger]',
  host: {
    type: 'button',
    '[attr.aria-expanded]': 'collapsible.open()',
    '[attr.aria-controls]': 'collapsible.contentId()',
    '[attr.data-state]': 'collapsible.state()',
    '[attr.data-disabled]': 'collapsible.disabled() ? "" : null',
    '[disabled]': 'collapsible.disabled()',
    '(click)': 'collapsible.toggle()',
  },
})
export class NdCollapsibleTrigger {
  protected readonly collapsible = inject(ND_COLLAPSIBLE);
}

/**
 * The content a {@link NdCollapsible} shows and hides. While closed it has
 * the `hidden` attribute, so it's out of the accessibility tree and the
 * tab order.
 *
 * @example
 * ```html
 * <div ndCollapsibleContent>…</div>
 * ```
 */
@Directive({
  selector: '[ndCollapsibleContent]',
  host: {
    '[attr.id]': 'collapsible.contentId()',
    '[attr.data-state]': 'collapsible.state()',
    '[attr.hidden]': 'collapsible.open() ? null : ""',
  },
})
export class NdCollapsibleContent {
  protected readonly collapsible = inject(ND_COLLAPSIBLE);

  constructor() {
    const ownId = inject(new HostAttributeToken('id'), { optional: true });
    if (ownId) {
      this.collapsible.contentId.set(ownId);
    }
  }
}
