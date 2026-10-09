import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  HostAttributeToken,
  inject,
  input,
  signal,
  type WritableSignal,
} from '@angular/core';
import {
  injectId,
  ND_FIELD,
  type NdFieldContext,
  type NdFieldControl,
} from '@ndop/primitives/internal';

/**
 * Adds a value to a list signal and returns a function that removes it.
 *
 * @param list - The list.
 * @param value - The value.
 * @returns The remover.
 */
function addTo<T>(list: WritableSignal<readonly T[]>, value: T): () => void {
  list.update((values) => [...values, value]);
  return () =>
    list.update((values) => values.filter((other) => other !== value));
}

/**
 * Headless form field: ties one control to its description and error. The
 * control's `aria-describedby` lists the description and, while the field
 * is invalid, the error, which is hidden until then and announced when it
 * appears. The field mirrors its control's state as `data-invalid` and
 * `data-disabled`.
 *
 * Ndop's controls join the field around them: `input[ndInput]`,
 * `textarea[ndInput]`, Checkbox, Switch, Radio Group, Slider thumbs and
 * Input OTP.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <div ndField>
 *   <label ndLabel for="email">Email</label>
 *   <input ndInput id="email" [formField]="form.email" />
 *   <p ndFieldDescription>We never share it.</p>
 *   <div ndFieldError>Enter a valid email address.</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndField]',
  exportAs: 'ndField',
  providers: [{ provide: ND_FIELD, useExisting: NdField }],
  host: {
    role: 'group',
    '[attr.data-invalid]': 'isInvalid() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class NdField implements NdFieldContext {
  /** Marks the field invalid by hand, for errors no control reports. */
  readonly invalid = input(false, { transform: booleanAttribute });

  private readonly controls = signal<readonly NdFieldControl[]>([]);
  private readonly descriptions = signal<readonly string[]>([]);
  private readonly errors = signal<readonly string[]>([]);

  /** Whether the field is invalid: by hand, or because a control is. */
  readonly isInvalid = computed(
    () =>
      this.invalid() || this.controls().some((control) => control.invalid()),
  );

  /** Whether every control in the field is disabled. */
  readonly isDisabled = computed(() => {
    const controls = this.controls();
    return (
      controls.length > 0 && controls.every((control) => control.disabled())
    );
  });

  /** What the field's controls list in `aria-describedby`. */
  readonly describedBy = computed(
    () =>
      [...this.descriptions(), ...(this.isInvalid() ? this.errors() : [])].join(
        ' ',
      ) || null,
  );

  /**
   * Adds a control to the field.
   *
   * @param control - The control's state.
   * @returns A function that removes it.
   */
  registerControl(control: NdFieldControl): () => void {
    return addTo(this.controls, control);
  }

  /**
   * Adds a description's id.
   *
   * @param id - The description element's id.
   * @returns A function that removes it.
   */
  registerDescription(id: string): () => void {
    return addTo(this.descriptions, id);
  }

  /**
   * Adds an error's id.
   *
   * @param id - The error element's id.
   * @returns A function that removes it.
   */
  registerError(id: string): () => void {
    return addTo(this.errors, id);
  }
}

/**
 * Help text for a {@link NdField}'s control, which lists its id in
 * `aria-describedby`. Keeps its own `id` or gets a generated one. Outside
 * a field, such as under a field set's legend, it's plain text.
 *
 * @example
 * ```html
 * <p ndFieldDescription>We never share it.</p>
 * ```
 */
@Directive({
  selector: '[ndFieldDescription]',
  host: { '[attr.id]': 'id' },
})
export class NdFieldDescription {
  /** The element's id. */
  protected readonly id =
    inject(new HostAttributeToken('id'), { optional: true }) ??
    injectId('nd-field-description');

  constructor() {
    const field = inject(NdField, { optional: true });
    if (field) {
      inject(DestroyRef).onDestroy(field.registerDescription(this.id));
    }
  }
}

/**
 * The error message of a {@link NdField}: hidden while the field is valid,
 * and announced (`role="alert"`) when it appears. While shown, the
 * control's `aria-describedby` lists it. Put the messages inside it.
 *
 * @example
 * ```html
 * <div ndFieldError>
 *   @for (error of form.email().errors(); track error) {
 *     <p>{{ error.message }}</p>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[ndFieldError]',
  host: {
    role: 'alert',
    '[attr.id]': 'id',
    '[attr.hidden]': 'field.isInvalid() ? null : ""',
  },
})
export class NdFieldError {
  /** The element's id. */
  protected readonly id =
    inject(new HostAttributeToken('id'), { optional: true }) ??
    injectId('nd-field-error');

  protected readonly field = inject(NdField);

  constructor() {
    inject(DestroyRef).onDestroy(this.field.registerError(this.id));
  }
}
