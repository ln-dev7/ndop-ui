import { clsx, type ClassValue } from 'clsx';

/**
 * Variant definitions: for each variant name, a map from option to classes.
 * Options named `true` and `false` make the variant a boolean.
 */
export type VariantDefinitions = Record<string, Record<string, ClassValue>>;

/**
 * The value a variant accepts: one of its option names, or a boolean when
 * the variant defines `true` or `false` options.
 */
export type VariantValue<Options> =
  | Exclude<keyof Options, 'true' | 'false'>
  | ('true' extends keyof Options ? boolean : never)
  | ('false' extends keyof Options ? boolean : never);

/**
 * A choice of option per variant. Omitted or `null` entries fall back to
 * the defaults.
 */
export type VariantSelection<V extends VariantDefinitions> = {
  [K in keyof V]?: VariantValue<V[K]> | null;
};

/**
 * Configuration for {@link variants}, mirroring class-variance-authority.
 */
export interface VariantsConfig<V extends VariantDefinitions> {
  /** Classes applied whatever the selection. */
  base?: ClassValue;
  /** Variant definitions. */
  variants?: V;
  /**
   * Extra classes applied when every listed variant matches. A list of
   * values matches any of them.
   */
  compoundVariants?: Array<
    { [K in keyof V]?: VariantValue<V[K]> | VariantValue<V[K]>[] } & {
      class: ClassValue;
    }
  >;
  /** Option used for each variant when the caller doesn't choose one. */
  defaults?: VariantSelection<V>;
}

/**
 * The class function returned by {@link variants}. Its `definitions`
 * property exposes the variant table, which is also what {@link VariantOf}
 * reads types from.
 */
export interface VariantsFunction<V extends VariantDefinitions> {
  /**
   * Returns the classes for a selection.
   *
   * @param selection - Chosen options; omitted ones use the defaults.
   */
  (selection?: VariantSelection<V>): string;
  /** The variant definitions this function was built from. */
  readonly definitions: V;
}

/**
 * The value type of one variant of a {@link variants} function, used to type
 * a styled item's inputs.
 *
 * @example
 * ```ts
 * readonly size = input<VariantOf<typeof buttonVariants, 'size'>>('md');
 * ```
 */
export type VariantOf<F, K extends string> =
  F extends VariantsFunction<infer V>
    ? K extends keyof V
      ? VariantValue<V[K]>
      : never
    : never;

/**
 * Builds a typed class function from a variant table, with the same model
 * as class-variance-authority: base classes, one option per variant,
 * compound variants and defaults. The result joins classes without merging;
 * styled items pass it through `cn()` together with the user's `class`.
 *
 * @param config - Base classes, variants, compound variants and defaults.
 * @returns A function from a variant selection to a class string.
 *
 * @example
 * ```ts
 * const badge = variants({
 *   base: 'inline-flex rounded-md px-2',
 *   variants: { tone: { neutral: 'bg-muted', danger: 'bg-destructive' } },
 *   defaults: { tone: 'neutral' },
 * });
 * badge({ tone: 'danger' }); // 'inline-flex rounded-md px-2 bg-destructive'
 * ```
 */
export function variants<V extends VariantDefinitions = Record<never, never>>(
  config: VariantsConfig<V>,
): VariantsFunction<V> {
  const definitions = (config.variants ?? {}) as V;
  const names = Object.keys(definitions) as (keyof V & string)[];

  const resolve = (
    selection: VariantSelection<V> | undefined,
  ): Partial<Record<keyof V, unknown>> => {
    const resolved: Partial<Record<keyof V, unknown>> = {};
    for (const name of names) {
      resolved[name] =
        selection?.[name] ?? config.defaults?.[name] ?? undefined;
    }
    return resolved;
  };

  const fn = (selection?: VariantSelection<V>): string => {
    const resolved = resolve(selection);
    const classes: ClassValue[] = [config.base];

    for (const name of names) {
      const value = resolved[name];
      if (value !== undefined) {
        classes.push(definitions[name]?.[String(value)]);
      }
    }

    for (const compound of config.compoundVariants ?? []) {
      const { class: compoundClass, ...conditions } = compound;
      const matches = Object.entries(conditions).every(([name, expected]) => {
        const actual = resolved[name as keyof V];
        return Array.isArray(expected)
          ? expected.includes(actual)
          : expected === actual;
      });
      if (matches) {
        classes.push(compoundClass);
      }
    }

    return clsx(classes);
  };

  return Object.assign(fn, { definitions });
}
