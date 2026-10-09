import { computed, Directive, input } from '@angular/core';
import {
  NdField,
  NdFieldDescription,
  NdFieldError,
} from '@ndop/primitives/form-field';
import { NdLabel } from '@ndop/primitives/label';
import { cn, variants, type VariantOf } from '@/lib/utils';

/**
 * A set of related fields, on a native `fieldset`, titled by a
 * {@link FieldLegend}.
 *
 * @example
 * ```html
 * <fieldset ndFieldSet>
 *   <legend ndFieldLegend>Address</legend>
 *   <div ndFieldGroup>…</div>
 * </fieldset>
 * ```
 */
@Directive({
  selector: 'fieldset[ndFieldSet]',
  host: { 'data-slot': 'field-set', '[class]': 'classes()' },
})
export class FieldSet {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex flex-col gap-6',
      'has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
      this.class(),
    ),
  );
}

/**
 * The title of a {@link FieldSet}, on a native `legend`: `legend` size by
 * default, or `label` size for a set that reads as one field.
 *
 * @example
 * ```html
 * <legend ndFieldLegend variant="label">Notifications</legend>
 * ```
 */
@Directive({
  selector: 'legend[ndFieldLegend]',
  host: {
    'data-slot': 'field-legend',
    '[attr.data-variant]': 'variant()',
    '[class]': 'classes()',
  },
})
export class FieldLegend {
  /** Text size: `legend` or `label`. */
  readonly variant = input<'legend' | 'label'>('legend');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'mb-3 font-medium',
      'data-[variant=legend]:text-base',
      'data-[variant=label]:text-sm',
      this.class(),
    ),
  );
}

/**
 * Stacks fields with even spacing; responsive fields inside switch to a
 * row when the group is wide enough.
 *
 * @example
 * ```html
 * <div ndFieldGroup>…</div>
 * ```
 */
@Directive({
  selector: '[ndFieldGroup]',
  host: { 'data-slot': 'field-group', '[class]': 'classes()' },
})
export class FieldGroup {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
      this.class(),
    ),
  );
}

/** Class table for {@link Field}. */
export const fieldVariants = variants({
  base: 'group/field flex w-full gap-3 data-invalid:text-destructive',
  variants: {
    orientation: {
      vertical: 'flex-col [&>*]:w-full [&>.sr-only]:w-auto',
      horizontal: cn(
        'flex-row items-center',
        '[&>[data-slot=field-label]]:flex-auto',
        'has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      ),
      responsive: cn(
        'flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto',
        '@md/field-group:[&>[data-slot=field-label]]:flex-auto',
        '@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      ),
    },
  },
  defaults: { orientation: 'vertical' },
});

/** Layout of a {@link Field}. */
export type FieldOrientation = VariantOf<typeof fieldVariants, 'orientation'>;

/**
 * One form field (`@ndop/primitives/form-field`): a control with its
 * label, description and error. Ndop controls inside it list the
 * description and, once invalid, the error in their `aria-describedby`;
 * the error shows only then. The field turns destructive while its control
 * is invalid.
 *
 * @example
 * ```html
 * <div ndField>
 *   <label ndFieldLabel for="email">Email</label>
 *   <input ndInput id="email" type="email" [formField]="form.email" />
 *   <p ndFieldDescription>We'll never share your email.</p>
 *   <div ndFieldError>Enter a valid email address.</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndField]',
  hostDirectives: [{ directive: NdField, inputs: ['invalid'] }],
  host: {
    'data-slot': 'field',
    '[attr.data-orientation]': 'orientation()',
    '[class]': 'classes()',
  },
})
export class Field {
  /**
   * `vertical` stacks the label above the control; `horizontal` puts them
   * side by side, as for a checkbox; `responsive` switches from one to the
   * other when its `ndFieldGroup` is wide enough.
   */
  readonly orientation = input<FieldOrientation>('vertical');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(fieldVariants({ orientation: this.orientation() }), this.class()),
  );
}

/**
 * Groups a field's label and description beside its control, as for a
 * checkbox with help text.
 *
 * @example
 * ```html
 * <div ndFieldContent>
 *   <label ndFieldLabel for="news">Newsletter</label>
 *   <p ndFieldDescription>One email a month.</p>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndFieldContent]',
  host: { 'data-slot': 'field-content', '[class]': 'classes()' },
})
export class FieldContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/field-content flex flex-1 flex-col gap-1.5 leading-snug',
      this.class(),
    ),
  );
}

/**
 * A field's label, on a native `label` (`@ndop/primitives/label`). Wrapping
 * a whole {@link Field} in it makes a selectable card, highlighted while
 * the checkbox or radio inside is checked; its descriptions darken then,
 * to keep their contrast on the tint.
 *
 * @example
 * ```html
 * <label ndFieldLabel for="email">Email</label>
 * ```
 */
@Directive({
  selector: 'label[ndFieldLabel]',
  hostDirectives: [{ directive: NdLabel, inputs: ['for'] }],
  host: { 'data-slot': 'field-label', '[class]': 'classes()' },
})
export class FieldLabel {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
      'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-disabled/field:opacity-50',
      'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4',
      'has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10',
      'has-data-[state=checked]:[&_[data-slot=field-description]]:text-foreground/80',
      this.class(),
    ),
  );
}

/**
 * A field's title when it isn't a label, such as the heading of a
 * selectable card.
 *
 * @example
 * ```html
 * <div ndFieldTitle>Pro plan</div>
 * ```
 */
@Directive({
  selector: '[ndFieldTitle]',
  host: { 'data-slot': 'field-label', '[class]': 'classes()' },
})
export class FieldTitle {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-disabled/field:opacity-50',
      this.class(),
    ),
  );
}

/**
 * Help text for a {@link Field}'s control, which lists it in
 * `aria-describedby`.
 *
 * @example
 * ```html
 * <p ndFieldDescription>We'll never share your email.</p>
 * ```
 */
@Directive({
  selector: '[ndFieldDescription]',
  hostDirectives: [NdFieldDescription],
  host: { 'data-slot': 'field-description', '[class]': 'classes()' },
})
export class FieldDescription {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance',
      'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
      '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
      this.class(),
    ),
  );
}

/**
 * A line between fields, with optional text on it, such as "Or".
 *
 * @example
 * ```html
 * <div ndFieldSeparator>
 *   <span ndFieldSeparatorContent>Or continue with</span>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndFieldSeparator]',
  host: { 'data-slot': 'field-separator', '[class]': 'classes()' },
})
export class FieldSeparator {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
      'before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-border',
      this.class(),
    ),
  );
}

/**
 * The text on a {@link FieldSeparator}'s line.
 *
 * @example
 * ```html
 * <span ndFieldSeparatorContent>Or continue with</span>
 * ```
 */
@Directive({
  selector: '[ndFieldSeparatorContent]',
  host: { 'data-slot': 'field-separator-content', '[class]': 'classes()' },
})
export class FieldSeparatorContent {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative mx-auto block w-fit bg-background px-2 text-muted-foreground',
      this.class(),
    ),
  );
}

/**
 * A {@link Field}'s error, shown and announced once its control is invalid
 * and touched. Put the messages inside: one as text, several as a list.
 *
 * @example
 * ```html
 * <div ndFieldError>
 *   @for (error of form.email().errors(); track error.kind) {
 *     <p>{{ error.message }}</p>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[ndFieldError]',
  hostDirectives: [NdFieldError],
  host: { 'data-slot': 'field-error', '[class]': 'classes()' },
})
export class FieldError {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn('text-sm font-normal text-destructive', this.class()),
  );
}
