import { computed, Injectable, signal, type Signal } from '@angular/core';

/**
 * State a form control publishes for elements that refer to it by id, such
 * as a `label[ndLabel]` with a matching `for`.
 */
export interface NdControlState {
  /** Whether the control is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the control should present as invalid. */
  readonly invalid: Signal<boolean>;
}

/**
 * App-wide, signal-based index of form controls by element id. It lets a
 * label mirror its control's state without DOM queries, so it works during
 * SSR and without zone.js.
 *
 * @example
 * ```ts
 * const state = inject(NdControlRegistry).lookup(() => this.for());
 * const disabled = computed(() => state()?.disabled() ?? false);
 * ```
 */
@Injectable({ providedIn: 'root' })
export class NdControlRegistry {
  private readonly controls = signal<ReadonlyMap<string, NdControlState>>(
    new Map(),
  );

  /**
   * Publishes a control's state under an id.
   *
   * @param id - The control element's id.
   * @param state - Signals describing the control.
   * @returns A function that removes the entry.
   */
  register(id: string, state: NdControlState): () => void {
    this.controls.update((controls) => new Map(controls).set(id, state));
    return () =>
      this.controls.update((controls) => {
        if (controls.get(id) !== state) {
          return controls;
        }
        const next = new Map(controls);
        next.delete(id);
        return next;
      });
  }

  /**
   * Follows the control registered under a changing id.
   *
   * @param id - Reads the id to look up; `undefined` or empty means none.
   * @returns The registered state, or `undefined`.
   */
  lookup(id: () => string | undefined): Signal<NdControlState | undefined> {
    return computed(() => {
      const key = id();
      return key ? this.controls().get(key) : undefined;
    });
  }
}
