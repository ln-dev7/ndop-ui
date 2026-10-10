import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  forwardRef,
  inject,
  InjectionToken,
  input,
  model,
  numberAttribute,
  output,
  signal,
  type AfterContentInit,
  type OnInit,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import type { FormValueControl } from '@angular/forms/signals';
import { NdControlRegistry } from '@ndop/primitives/input';
import {
  injectFieldDescribedBy,
  injectFormState,
} from '@ndop/primitives/internal';

/** The enclosing {@link NdInputOtp}, injected by its parts. */
export const ND_INPUT_OTP = new InjectionToken<NdInputOtp>('ND_INPUT_OTP');

/**
 * Turns the `allow` input into a pattern for one character, dropping the
 * global and sticky flags, whose `lastIndex` would make `test` stateful.
 *
 * @param value - A regular expression, or its source as a string.
 * @returns The pattern.
 */
function characterPattern(value: RegExp | string): RegExp {
  const pattern = typeof value === 'string' ? new RegExp(value) : value;
  return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
}

/**
 * Headless one-time code input: one native `input[ndInputOtpInput]` holds
 * the code, so screen readers, autofill and password managers see a single
 * field, and `[ndInputOtpSlot]`s draw its characters. Characters `allow`
 * rejects are dropped, and pasting fills the code from the start. The root
 * owns the value, so it's the `ControlValueAccessor` that Signal Forms
 * (`[formField]`), reactive and template-driven forms bind (ADR-0004,
 * amendments 1 and 4).
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <div ndInputOtp [length]="6" [(value)]="code">
 *   <input ndInputOtpInput aria-label="Verification code" />
 *   <div ndInputOtpGroup>
 *     @for (index of [0, 1, 2, 3, 4, 5]; track index) {
 *       <div ndInputOtpSlot [index]="index"></div>
 *     }
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[ndInputOtp]',
  exportAs: 'ndInputOtp',
  providers: [
    { provide: ND_INPUT_OTP, useExisting: NdInputOtp },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NdInputOtp),
      multi: true,
    },
  ],
  host: {
    // Codes read left to right in every language, so the slots don't
    // mirror.
    dir: 'ltr',
    '[attr.data-complete]': 'complete() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-invalid]': 'showInvalid() ? "" : null',
  },
})
export class NdInputOtp
  implements
    ControlValueAccessor,
    FormValueControl<string>,
    OnInit,
    AfterContentInit
{
  /** The code. Two-way bindable with `[(value)]`. */
  readonly value = model('');

  /** Initial `value` when it isn't bound. */
  readonly defaultValue = input('');

  /** The code's length: how many slots it fills. */
  readonly length = input.required({ transform: numberAttribute });

  /**
   * A regular expression one character must match to be kept, or its
   * source. Digits by default.
   */
  readonly allow = input(/\d/, {
    transform: (value: RegExp | string) => characterPattern(value),
  });

  /** The input's `inputmode`, which picks the on-screen keyboard. */
  readonly inputMode = input<'numeric' | 'text'>('numeric');

  /** Disables the input. A disabled bound field does too. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Marks the code invalid when no forms library is bound; with one, the
   * field's state decides.
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Emits the code when the user completes it. */
  readonly completed = output<string>();

  private readonly form = injectFormState();
  private readonly formDisabled = signal(false);

  /** Whether the input has focus. */
  readonly focused = signal(false);

  /** Whether the input is disabled, by its input or by a forms library. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  /**
   * Whether the code presents as invalid: the bound field is invalid and
   * touched, or, without a forms library, the `invalid` input is set.
   */
  readonly showInvalid = computed(() =>
    this.form.bound() ? this.form.invalid() : this.invalid(),
  );

  /** Whether the code has `length` characters. */
  readonly complete = computed(() => this.value().length >= this.length());

  /** The slot the next character goes in; the last once complete. */
  readonly activeIndex = computed(() =>
    Math.min(this.value().length, this.length() - 1),
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnInit(): void {
    // Read once, before the first render, so the server renders the
    // initial state.
    const initial = this.defaultValue();
    if (initial && !this.value()) {
      this.value.set(this.accept(initial));
    }
  }

  ngAfterContentInit(): void {
    this.form.connect();
  }

  /**
   * Keeps the characters `allow` accepts, up to `length`.
   *
   * @param text - Typed, pasted or autofilled text.
   * @returns The code it gives.
   */
  accept(text: string): string {
    const allow = this.allow();
    return [...text]
      .filter((character) => allow.test(character))
      .slice(0, this.length())
      .join('');
  }

  /**
   * Sets the code as the user typed or pasted it, reports it to a bound
   * forms library, and emits `completed` when it becomes complete.
   *
   * @param text - The input's new text.
   * @returns The code that was kept.
   */
  setFromUser(text: string): string {
    const code = this.accept(text);
    if (code !== this.value()) {
      this.value.set(code);
      this.onChange(code);
      if (code.length === this.length()) {
        this.completed.emit(code);
      }
    }
    return code;
  }

  /** Tells a bound forms library that the input was left. */
  markTouched(): void {
    this.onTouched();
  }

  /**
   * Sets the code from a forms library.
   *
   * @param value - The field's value; anything but a string clears it.
   */
  writeValue(value: unknown): void {
    this.value.set(typeof value === 'string' ? value : '');
  }

  /**
   * Registers the forms library's change callback.
   *
   * @param fn - Called with the new code on user changes.
   */
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers the forms library's touched callback.
   *
   * @param fn - Called when focus leaves the input.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Disables or enables the input from a forms library.
   *
   * @param disabled - Whether the field is disabled.
   */
  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }
}

/** Keys that would move the caret away from the end of the code. */
const CARET_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

/**
 * The native input of a {@link NdInputOtp}, which holds the whole code. Name
 * it with a `label` or `aria-label`; style it to sit, invisible, over the
 * slots, so clicking a slot focuses it.
 *
 * @example
 * ```html
 * <input ndInputOtpInput id="code" />
 * ```
 */
@Directive({
  selector: 'input[ndInputOtpInput]',
  host: {
    autocomplete: 'one-time-code',
    spellcheck: 'false',
    '[attr.id]': 'id()',
    '[attr.maxlength]': 'otp.length()',
    '[attr.inputmode]': 'otp.inputMode()',
    '[attr.aria-invalid]': 'otp.showInvalid() || null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.data-invalid]': 'otp.showInvalid() ? "" : null',
    '[disabled]': 'otp.isDisabled()',
    '[value]': 'otp.value()',
    '(input)': 'input()',
    '(paste)': 'paste($event)',
    '(keydown)': 'keydown($event)',
    '(focus)': 'focus()',
    '(blur)': 'blur()',
    '(click)': 'caretToEnd()',
    '(select)': 'caretToEnd()',
  },
})
export class NdInputOtpInput {
  /** Element id; also the key a `label[ndLabel]` uses to find it. */
  readonly id = input<string>();

  protected readonly otp = inject(ND_INPUT_OTP);
  private readonly element =
    inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  protected readonly describedBy = injectFieldDescribedBy({
    invalid: this.otp.showInvalid,
    disabled: this.otp.isDisabled,
  });

  constructor() {
    const registry = inject(NdControlRegistry);
    effect((onCleanup) => {
      const id = this.id();
      if (id) {
        onCleanup(
          registry.register(id, {
            disabled: this.otp.isDisabled,
            invalid: this.otp.showInvalid,
          }),
        );
      }
    });
  }

  /** Filters what was typed or autofilled. */
  protected input(): void {
    // The rejected characters are already in the native input, and the
    // value binding won't rewrite it when the code didn't change.
    this.element.value = this.otp.setFromUser(this.element.value);
    this.caretToEnd();
  }

  /**
   * Replaces the code with the pasted text's allowed characters, before
   * `maxlength` can cut the text short.
   *
   * @param event - The paste event.
   */
  protected paste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    event.preventDefault();
    this.element.value = this.otp.setFromUser(text);
    this.caretToEnd();
  }

  /**
   * Keeps the caret at the end of the code.
   *
   * @param event - The keydown event.
   */
  protected keydown(event: KeyboardEvent): void {
    if (CARET_KEYS.has(event.key)) {
      event.preventDefault();
    }
  }

  protected focus(): void {
    this.otp.focused.set(true);
    this.caretToEnd();
  }

  protected blur(): void {
    this.otp.focused.set(false);
    this.otp.markTouched();
  }

  /** Puts the caret after the last character. */
  protected caretToEnd(): void {
    const end = this.element.value.length;
    // Setting the selection fires `select`, which calls this again, so
    // only move a caret that isn't already at the end.
    if (
      this.element.selectionStart !== end ||
      this.element.selectionEnd !== end
    ) {
      this.element.setSelectionRange(end, end);
    }
  }
}

/**
 * A group of {@link NdInputOtpSlot}s, hidden from assistive technology:
 * the input is what it reads.
 *
 * @example
 * ```html
 * <div ndInputOtpGroup>…</div>
 * ```
 */
@Directive({
  selector: '[ndInputOtpGroup]',
  host: { 'aria-hidden': 'true' },
})
export class NdInputOtpGroup {}

/**
 * One character of a {@link NdInputOtp}'s code. Its text is that character;
 * `data-active` marks where the next one goes, and `data-caret` an active
 * empty slot, to draw a caret in.
 *
 * @example
 * ```html
 * <div ndInputOtpSlot [index]="0"></div>
 * ```
 */
@Directive({
  selector: '[ndInputOtpSlot]',
  host: {
    'aria-hidden': 'true',
    '[textContent]': 'character()',
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.data-filled]': 'character() ? "" : null',
    '[attr.data-caret]': 'active() && !character() ? "" : null',
    '[attr.data-invalid]': 'otp.showInvalid() ? "" : null',
  },
})
export class NdInputOtpSlot {
  /** The character's position in the code, from 0. */
  readonly index = input.required({ transform: numberAttribute });

  protected readonly otp = inject(ND_INPUT_OTP);

  /** The character in this slot, or `''`. */
  readonly character = computed(() => this.otp.value()[this.index()] ?? '');

  /** Whether the next character goes here while the input has focus. */
  readonly active = computed(
    () => this.otp.focused() && this.otp.activeIndex() === this.index(),
  );
}

/**
 * A visual separator between groups of slots, hidden from assistive
 * technology.
 *
 * @example
 * ```html
 * <div ndInputOtpSeparator><svg ndIcon="minus"></svg></div>
 * ```
 */
@Directive({
  selector: '[ndInputOtpSeparator]',
  host: { role: 'separator', 'aria-hidden': 'true' },
})
export class NdInputOtpSeparator {}
