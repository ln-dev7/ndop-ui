import {
  computed,
  DestroyRef,
  HostAttributeToken,
  inject,
  InjectionToken,
  type Signal,
} from '@angular/core';

/** A control's state, as a form field reads it. */
export interface NdFieldControl {
  /** Whether the control presents as invalid. */
  readonly invalid: Signal<boolean>;
  /** Whether the control is disabled. */
  readonly disabled: Signal<boolean>;
}

/**
 * What a form field (`@ndop/primitives/form-field`) offers the controls
 * inside it.
 */
export interface NdFieldContext {
  /**
   * Space-separated ids of the field's description and, while the field is
   * invalid, its error: what its control's `aria-describedby` lists.
   */
  readonly describedBy: Signal<string | null>;
  /**
   * Adds a control to the field, which then mirrors its state.
   *
   * @param control - The control's state.
   * @returns A function that removes it.
   */
  registerControl(control: NdFieldControl): () => void;
}

/** The enclosing form field, if any, injected by the controls inside it. */
export const ND_FIELD = new InjectionToken<NdFieldContext>('ND_FIELD');

/**
 * Joins a control to the form field around it: the field mirrors the
 * control's state, and the returned signal is what the control's
 * `aria-describedby` should be, its own static value followed by the
 * field's description and error ids. Call it in an injection context.
 *
 * @param control - The control's state.
 * @returns The `aria-describedby` value to bind, `null` when empty.
 *
 * @example
 * ```ts
 * protected readonly describedBy = injectFieldDescribedBy({
 *   invalid: this.showInvalid,
 *   disabled: this.isDisabled,
 * });
 * ```
 */
export function injectFieldDescribedBy(
  control: NdFieldControl,
): Signal<string | null> {
  const field = inject(ND_FIELD, { optional: true });
  const own = inject(new HostAttributeToken('aria-describedby'), {
    optional: true,
  });
  if (field) {
    inject(DestroyRef).onDestroy(field.registerControl(control));
  }
  return computed(
    () => [own, field?.describedBy()].filter(Boolean).join(' ') || null,
  );
}
