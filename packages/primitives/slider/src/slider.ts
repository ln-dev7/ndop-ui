import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  forwardRef,
  inject,
  InjectionToken,
  input,
  model,
  numberAttribute,
  signal,
  type AfterContentInit,
  type OnInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import {
  injectFieldDescribedBy,
  injectFormState,
  isRtl,
} from '@ndop/primitives/internal';

/** The enclosing {@link NdSlider}, injected by its parts. */
export const ND_SLIDER = new InjectionToken<NdSlider>('ND_SLIDER');

/** A slider's direction of travel. */
export type NdSliderOrientation = 'horizontal' | 'vertical';

/**
 * Headless slider: the WAI-ARIA slider pattern, or with several
 * `[ndSliderThumb]`s, the multi-thumb pattern. The root sets the scale
 * (`min`, `max`, `step`) and handles the pointer; each thumb owns one
 * value and is a form control of its own. Horizontal sliders run from the
 * start side, so they mirror in right-to-left layouts.
 *
 * @see spec.md in this entry point for the full contract.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/slider/
 *
 * @example
 * ```html
 * <div ndSlider [max]="100" [step]="5">
 *   <div ndSliderTrack><div ndSliderRange></div></div>
 *   <span ndSliderThumb aria-label="Volume" [(value)]="volume"></span>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndSlider]',
  exportAs: 'ndSlider',
  providers: [{ provide: ND_SLIDER, useExisting: NdSlider }],
  host: {
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(pointerdown)': 'pointerDown($event)',
    '(pointermove)': 'pointerMove($event)',
    '(pointerup)': 'pointerUp($event)',
    '(pointercancel)': 'pointerUp($event)',
  },
})
export class NdSlider {
  /** The lowest value. */
  readonly min = input(0, { transform: numberAttribute });

  /** The highest value. */
  readonly max = input(100, { transform: numberAttribute });

  /** The distance between allowed values, from `min`. */
  readonly step = input(1, { transform: numberAttribute });

  /** Horizontal (from the start side) or vertical (from the bottom). */
  readonly orientation = input<NdSliderOrientation>('horizontal');

  /** Disables every thumb. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly registered = signal<readonly NdSliderThumb[]>([]);
  private dragging: NdSliderThumb | null = null;

  /** The thumbs, in the order they registered: document order. */
  readonly thumbs = this.registered.asReadonly();

  /**
   * Where the range starts and ends, as percentages of the track: from
   * the start to a single thumb, or between the lowest and highest thumbs.
   */
  readonly range = computed(() => {
    const percents = this.thumbs().map((thumb) => thumb.percent());
    if (percents.length < 2) {
      return { start: 0, end: percents[0] ?? 0 };
    }
    return { start: Math.min(...percents), end: Math.max(...percents) };
  });

  /**
   * Adds a thumb.
   *
   * @param thumb - The thumb.
   * @returns A function that removes it.
   */
  register(thumb: NdSliderThumb): () => void {
    this.registered.update((thumbs) => [...thumbs, thumb]);
    return () =>
      this.registered.update((thumbs) =>
        thumbs.filter((other) => other !== thumb),
      );
  }

  /**
   * Where a value sits on the track.
   *
   * @param value - A value between `min` and `max`.
   * @returns Its position, from 0 to 100.
   */
  percent(value: number): number {
    const span = this.max() - this.min();
    return span > 0
      ? Math.min(100, Math.max(0, ((value - this.min()) / span) * 100))
      : 0;
  }

  /**
   * Rounds a value to the nearest step from `min`, within `min` and `max`.
   *
   * @param value - Any number.
   * @returns The nearest allowed value.
   */
  snap(value: number): number {
    const min = this.min();
    const step = this.step() > 0 ? this.step() : 1;
    const steps = Math.round((value - min) / step);
    // Rounded to the step's decimals, so 0.1 steps give 0.3, not
    // 0.30000000000000004.
    const decimals = (String(step).split('.')[1] ?? '').length;
    const snapped = Number((min + steps * step).toFixed(decimals));
    return Math.min(this.max(), Math.max(min, snapped));
  }

  /**
   * The values a thumb can take: the slider's bounds, narrowed by its
   * neighbors so thumbs can't pass each other.
   *
   * @param thumb - One of this slider's thumbs.
   * @returns Its lowest and highest values.
   */
  bounds(thumb: NdSliderThumb): { min: number; max: number } {
    const thumbs = this.thumbs();
    const index = thumbs.indexOf(thumb);
    const before = index > 0 ? thumbs[index - 1] : undefined;
    const after = thumbs[index + 1];
    return {
      min: before ? before.current() : this.min(),
      max: after ? after.current() : this.max(),
    };
  }

  /**
   * Moves the nearest thumb to the pressed point, focuses it, and follows
   * the pointer until it's released.
   *
   * @param event - The pointerdown event.
   */
  protected pointerDown(event: PointerEvent): void {
    if (this.disabled() || event.button !== 0) {
      return;
    }
    const value = this.valueAt(event);
    const thumb = this.nearest(value);
    if (!thumb || thumb.isDisabled()) {
      return;
    }
    // Stops the browser focusing the slider or selecting text; the thumb
    // is focused instead.
    event.preventDefault();
    this.dragging = thumb;
    this.element.setPointerCapture(event.pointerId);
    thumb.setFromUser(value);
    thumb.focus();
  }

  /**
   * Moves the dragged thumb.
   *
   * @param event - The pointermove event.
   */
  protected pointerMove(event: PointerEvent): void {
    if (this.dragging && this.element.hasPointerCapture(event.pointerId)) {
      this.dragging.setFromUser(this.valueAt(event));
    }
  }

  /**
   * Ends a drag.
   *
   * @param event - The pointerup or pointercancel event.
   */
  protected pointerUp(event: PointerEvent): void {
    this.dragging = null;
    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * The value under the pointer, from the slider's box and direction.
   *
   * @param event - A pointer event.
   * @returns The unsnapped value.
   */
  private valueAt(event: PointerEvent): number {
    const rect = this.element.getBoundingClientRect();
    let ratio: number;
    if (this.orientation() === 'vertical') {
      ratio = rect.height > 0 ? (rect.bottom - event.clientY) / rect.height : 0;
    } else {
      ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
      if (isRtl(this.element)) {
        ratio = 1 - ratio;
      }
    }
    return this.min() + ratio * (this.max() - this.min());
  }

  /**
   * The thumb closest to a value. Between thumbs at the same value, the
   * one in the direction of the press, so stacked range thumbs can still
   * be pulled apart.
   *
   * @param value - A value.
   * @returns The thumb, or `undefined` without any.
   */
  private nearest(value: number): NdSliderThumb | undefined {
    let best: NdSliderThumb | undefined;
    let distance = Infinity;
    for (const thumb of this.thumbs()) {
      const current = thumb.current();
      const next = Math.abs(current - value);
      if (next < distance || (next === distance && value > current)) {
        best = thumb;
        distance = next;
      }
    }
    return best;
  }
}

/**
 * The track of a {@link NdSlider}: presentational, with the slider's data
 * attributes for styling.
 *
 * @example
 * ```html
 * <div ndSliderTrack><div ndSliderRange></div></div>
 * ```
 */
@Directive({
  selector: '[ndSliderTrack]',
  host: {
    '[attr.data-orientation]': 'slider.orientation()',
    '[attr.data-disabled]': 'slider.disabled() ? "" : null',
  },
})
export class NdSliderTrack {
  protected readonly slider = inject(ND_SLIDER);
}

/**
 * The filled part of a {@link NdSlider}'s track. Its `start` and `end` are
 * percentages for the styled layer to position it with; the primitive sets
 * no styles.
 *
 * @example
 * ```html
 * <div ndSliderRange></div>
 * ```
 */
@Directive({
  selector: '[ndSliderRange]',
  exportAs: 'ndSliderRange',
  host: { '[attr.data-orientation]': 'slider.orientation()' },
})
export class NdSliderRange {
  /** The slider it fills. */
  readonly slider = inject(ND_SLIDER);

  /** Where it starts, from 0 to 100. */
  readonly start = computed(() => this.slider.range().start);

  /** Where it ends, from 0 to 100. */
  readonly end = computed(() => this.slider.range().end);
}

/**
 * One thumb of a {@link NdSlider}: a `role="slider"` element that owns one
 * value. It's a `ControlValueAccessor` for a number, which Signal Forms
 * (`[formField]`), reactive and template-driven forms bind (ADR-0004,
 * amendments 1 and 4). Name it with `aria-label` or `aria-labelledby`.
 *
 * @example
 * ```html
 * <span ndSliderThumb aria-label="Volume" [(value)]="volume"></span>
 * ```
 */
@Directive({
  selector: '[ndSliderThumb]',
  exportAs: 'ndSliderThumb',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdSliderThumb),
      multi: true,
    },
  ],
  host: {
    role: 'slider',
    '[attr.tabindex]': 'isDisabled() ? null : 0',
    '[attr.aria-valuenow]': 'current()',
    '[attr.aria-valuemin]': 'bounds().min',
    '[attr.aria-valuemax]': 'bounds().max',
    '[attr.aria-valuetext]': 'valueText() ?? null',
    '[attr.aria-orientation]': 'slider.orientation()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.aria-invalid]': 'showInvalid() || null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-orientation]': 'slider.orientation()',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-invalid]': 'showInvalid() ? "" : null',
    '(keydown)': 'keydown($event)',
    '(blur)': 'onTouched()',
  },
})
export class NdSliderThumb
  implements
    ControlValueAccessor,
    FormValueControl<number>,
    OnInit,
    AfterContentInit
{
  /** This thumb's value. Two-way bindable with `[(value)]`. */
  readonly value = model(0);

  /** Initial `value` when it isn't bound. */
  readonly defaultValue = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null
        ? undefined
        : numberAttribute(value),
  });

  /** Text for `aria-valuetext`, when the number alone doesn't say it. */
  readonly valueText = input<string>();

  /**
   * Marks the thumb invalid when no forms library is bound; with one, the
   * field's state decides.
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** The slider it belongs to. */
  readonly slider = inject(ND_SLIDER);

  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly form = injectFormState();
  private readonly formDisabled = signal(false);

  /** Whether the thumb is disabled, by the slider or a forms library. */
  readonly isDisabled = computed(
    () => this.slider.disabled() || this.formDisabled(),
  );

  /**
   * Whether the thumb presents as invalid: the bound field is invalid and
   * touched, or, without a forms library, the `invalid` input is set.
   */
  readonly showInvalid = computed(() =>
    this.form.bound() ? this.form.invalid() : this.invalid(),
  );

  /** The value, snapped to the slider's steps and within its bounds. */
  readonly current = computed(() => this.slider.snap(this.value()));

  /** Where the thumb sits on the track, from 0 to 100. */
  readonly percent = computed(() => this.slider.percent(this.current()));

  /** The values it can take, narrowed by neighboring thumbs. */
  readonly bounds = computed(() => this.slider.bounds(this));

  protected readonly describedBy = injectFieldDescribedBy({
    invalid: this.showInvalid,
    disabled: this.isDisabled,
  });

  private onChange: (value: number) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  constructor() {
    inject(DestroyRef).onDestroy(this.slider.register(this));
  }

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // initial state.
    const initial = this.defaultValue();
    if (initial !== undefined) {
      this.value.set(initial);
    }
  }

  ngAfterContentInit(): void {
    this.form.connect();
  }

  /** Focuses the thumb. */
  focus(): void {
    this.element.focus();
  }

  /**
   * Sets the value as the user would: snapped, within the thumb's bounds,
   * and reported to a bound forms library. Does nothing while disabled.
   *
   * @param value - Any number.
   */
  setFromUser(value: number): void {
    if (this.isDisabled()) {
      return;
    }
    const { min, max } = this.bounds();
    const next = Math.min(max, Math.max(min, this.slider.snap(value)));
    if (next !== this.value()) {
      this.value.set(next);
      this.onChange(next);
    }
  }

  /**
   * Sets the value from a forms library.
   *
   * @param value - The field's value; anything but a number leaves the
   *   thumb at the slider's minimum.
   */
  writeValue(value: unknown): void {
    this.value.set(typeof value === 'number' ? value : this.slider.min());
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new value on user changes.
   */
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the thumb.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Disables or enables the thumb from a forms library.
   *
   * @param disabled - Whether the field is disabled.
   */
  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  /**
   * Changes the value with the arrow keys, Page Up and Page Down, Home and
   * End; horizontal arrows follow the reading direction.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    const step = this.slider.step();
    const forward =
      this.slider.orientation() === 'horizontal' && isRtl(this.element)
        ? -1
        : 1;
    const current = this.current();
    const { min, max } = this.bounds();
    const next: Record<string, number> = {
      ArrowRight: current + step * forward,
      ArrowLeft: current - step * forward,
      ArrowUp: current + step,
      ArrowDown: current - step,
      PageUp: current + step * 10,
      PageDown: current - step * 10,
      Home: min,
      End: max,
    };
    const value = next[event.key];
    if (value === undefined) {
      return;
    }
    event.preventDefault();
    this.setFromUser(value);
  }
}
