import {
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
  type Signal,
} from '@angular/core';
import { NgControl, type AbstractControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';

/**
 * The state a forms library holds for a control that owns its value,
 * read from whichever forms directive is on the control's element:
 * `FormField` for Signal Forms, `NgControl` for reactive and
 * template-driven forms. Disabled state isn't here: every forms library
 * sets it through the control's `setDisabledState`.
 */
export interface NdFormState {
  /** Whether a forms directive is bound to the element. */
  readonly bound: Signal<boolean>;
  /**
   * Whether the bound field is invalid and has been touched, so errors
   * don't show before the user has interacted; `false` without one.
   */
  readonly invalid: Signal<boolean>;
  /**
   * Finds the forms directive on the element. Call it from
   * `ngAfterContentInit`, before the first host bindings are checked.
   */
  connect(): void;
}

/**
 * Reads the forms state of a control that provides a
 * `ControlValueAccessor` (ADR-0004, amendments 1 and 4). Call it in an
 * injection context, such as a field initializer, and call
 * {@link NdFormState.connect} from `ngAfterContentInit`.
 *
 * @returns The state, as signals.
 *
 * @example
 * ```ts
 * protected readonly form = injectFormState();
 * ngAfterContentInit() { this.form.connect(); }
 * ```
 */
export function injectFormState(): NdFormState {
  const injector = inject(Injector);
  const destroyRef = inject(DestroyRef);
  const field = signal<FormField<unknown> | null>(null);
  const control = signal<AbstractControl | null>(null);
  // Reactive forms state isn't signal-based, so control events bump this
  // counter to recompute the derived signals.
  const version = signal(0);

  return {
    bound: computed(() => field() !== null || control() !== null),
    invalid: computed(() => {
      const state = field()?.state();
      if (state) {
        return state.invalid() && state.touched();
      }
      version();
      const bound = control();
      return bound ? bound.invalid && bound.touched : false;
    }),
    connect() {
      if (field() || control()) {
        return;
      }
      // Looked up here rather than injected: both forms directives inject
      // the element's value accessors, which include this control, so
      // injecting them from its constructor would be circular. By the
      // first content check, `formControlName` has also resolved its
      // control.
      const formField = injector.get(FormField, null, {
        self: true,
        optional: true,
      });
      if (formField) {
        field.set(formField);
        return;
      }
      const bound = injector.get(NgControl, null, {
        self: true,
        optional: true,
      })?.control;
      if (bound) {
        control.set(bound);
        const subscription = bound.events.subscribe(() =>
          version.update((value) => value + 1),
        );
        destroyRef.onDestroy(() => subscription.unsubscribe());
      }
    },
  };
}
