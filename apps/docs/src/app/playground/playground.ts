import type { InputSignal, Type } from '@angular/core';
import type {
  MemberData,
  PartData,
  TemplatePalette,
} from '../components/component-data';

/** A control's value. */
export type PlaygroundValue = string | number | boolean;

/** The playground's values, by input name. */
export type PlaygroundValues = Readonly<Record<string, PlaygroundValue>>;

/** A component that renders an item's part with the playground's values. */
export interface PlaygroundHostComponent {
  /** Every control's value, defaults included. */
  readonly values: InputSignal<PlaygroundValues>;
}

/**
 * An item's playground (ADR-0016, "Playground"): which part's inputs it
 * exposes, the component that binds them, and the template its snippet
 * is generated from. One per item, in `playground/hosts`.
 */
export interface PlaygroundHost {
  /** The part whose inputs become controls, such as `Button`. */
  part: string;
  /** Inputs to leave out, such as `open`. */
  exclude?: readonly string[];
  /** Slider bounds of number inputs: minimum, maximum and step. */
  ranges?: Readonly<Record<string, readonly [number, number, number]>>;
  /**
   * The snippet's template, the same markup the host component renders;
   * `%attrs%` marks where the part's attributes go.
   */
  snippet: string;
  /** Renders the part with the values. */
  component: Type<PlaygroundHostComponent>;
}

/** One control, derived from an input in the metadata. */
export type PlaygroundControl =
  | {
      kind: 'enum';
      name: string;
      options: readonly string[];
      default: string;
      descriptionHtml: string;
    }
  | { kind: 'boolean'; name: string; default: boolean; descriptionHtml: string }
  | { kind: 'string'; name: string; default: string; descriptionHtml: string }
  | {
      kind: 'number';
      name: string;
      default: number;
      min: number;
      max: number;
      step: number;
      descriptionHtml: string;
    };

/**
 * The controls for a part's inputs and models (RFC-0001: enum → segmented
 * control, boolean → switch, string → text field, number → slider), in the
 * metadata's order. Inputs of any other type, and `class`, have none.
 *
 * @param part - The part's API reference.
 * @param host - The item's playground.
 * @returns The controls.
 */
export function controlsFor(
  part: PartData,
  host: Pick<PlaygroundHost, 'exclude' | 'ranges'>,
): PlaygroundControl[] {
  const excluded = new Set(['class', ...(host.exclude ?? [])]);
  return [...part.inputs, ...part.models]
    .filter((member) => !excluded.has(member.name))
    .flatMap((member) => {
      const control = controlFor(member, host.ranges?.[member.name]);
      return control ? [control] : [];
    });
}

/**
 * The control for one input.
 *
 * @param member - The input.
 * @param range - Slider bounds, for a number.
 * @returns The control, or `undefined` for an input it can't edit.
 */
function controlFor(
  member: MemberData,
  range: readonly [number, number, number] | undefined,
): PlaygroundControl | undefined {
  const { name, descriptionHtml } = member;
  const literal = member.default?.replace(/^'(.*)'$/, '$1');
  if (member.values?.length) {
    return {
      kind: 'enum',
      name,
      options: member.values,
      default: literal ?? member.values[0] ?? '',
      descriptionHtml,
    };
  }
  const type = member.type.replace(/\s*\|\s*undefined$/, '');
  if (type === 'boolean') {
    return {
      kind: 'boolean',
      name,
      default: literal === 'true',
      descriptionHtml,
    };
  }
  if (type === 'string') {
    return { kind: 'string', name, default: literal ?? '', descriptionHtml };
  }
  if (type === 'number') {
    const [min, max, step] = range ?? [0, 100, 1];
    return {
      kind: 'number',
      name,
      default: Number(literal ?? min),
      min,
      max,
      step,
      descriptionHtml,
    };
  }
  return undefined;
}

/**
 * Every control's default.
 *
 * @param controls - The controls.
 * @returns Their values.
 */
export function defaultValues(
  controls: readonly PlaygroundControl[],
): PlaygroundValues {
  return Object.fromEntries(
    controls.map((control) => [control.name, control.default]),
  );
}

/**
 * The values a URL's query sets, over the defaults. Parameters that name
 * no control or hold a value it can't take are ignored, so a stale or
 * edited link still opens.
 *
 * @param controls - The controls.
 * @param query - The URL's query.
 * @returns The values.
 */
export function valuesFromQuery(
  controls: readonly PlaygroundControl[],
  query: URLSearchParams,
): PlaygroundValues {
  const values: Record<string, PlaygroundValue> = {
    ...defaultValues(controls),
  };
  for (const control of controls) {
    const raw = query.get(control.name);
    if (raw === null) continue;
    if (control.kind === 'enum' && control.options.includes(raw)) {
      values[control.name] = raw;
    } else if (control.kind === 'boolean' && /^(true|false)$/.test(raw)) {
      values[control.name] = raw === 'true';
    } else if (control.kind === 'string') {
      values[control.name] = raw;
    } else if (control.kind === 'number') {
      const number = Number(raw);
      if (
        raw.trim() !== '' &&
        Number.isFinite(number) &&
        number >= control.min &&
        number <= control.max
      ) {
        values[control.name] = number;
      }
    }
  }
  return values;
}

/**
 * The query for the values: only those that differ from the defaults, so
 * an untouched playground leaves the URL clean.
 *
 * @param controls - The controls.
 * @param values - The values.
 * @returns The query parameters.
 */
export function queryFromValues(
  controls: readonly PlaygroundControl[],
  values: PlaygroundValues,
): URLSearchParams {
  const query = new URLSearchParams();
  for (const control of controls) {
    const value = values[control.name];
    if (value !== undefined && value !== control.default) {
      query.set(control.name, String(value));
    }
  }
  return query;
}

/**
 * The snippet for the values: the host's template with the part's
 * attributes for every value that differs from its default, so the
 * snippet is the shortest correct markup for what the preview shows.
 *
 * @param host - The item's playground.
 * @param controls - The controls.
 * @param values - The values.
 * @returns Copy-pasteable template markup.
 */
export function snippetFor(
  host: Pick<PlaygroundHost, 'snippet'>,
  controls: readonly PlaygroundControl[],
  values: PlaygroundValues,
): string {
  const attributes = controls.flatMap((control) => {
    const value = values[control.name];
    if (value === undefined || value === control.default) return [];
    if (typeof value === 'string') {
      return [`${control.name}="${value.replace(/"/g, '&quot;')}"`];
    }
    return [`[${control.name}]="${value}"`];
  });
  return host.snippet.replace(
    '%attrs%',
    attributes.map((attribute) => ` ${attribute}`).join(''),
  );
}

/** A run of template text and the palette entry that colors it. */
export interface TemplateToken {
  /** The text. */
  text: string;
  /** Which color. */
  kind: keyof TemplatePalette;
}

/**
 * Splits template markup into colored runs, as Shiki colors Angular
 * templates (the palette comes from Shiki at build time), so a snippet
 * generated in the browser looks like the build-time code blocks.
 *
 * @param markup - Template markup, such as a playground snippet.
 * @returns The runs, in order; joined, they are the markup.
 */
export function tokenizeTemplate(markup: string): TemplateToken[] {
  const tokens: TemplateToken[] = [];
  const push = (text: string, kind: TemplateToken['kind']) => {
    if (!text) return;
    const last = tokens.at(-1);
    if (last?.kind === kind) last.text += text;
    else tokens.push({ text, kind });
  };
  const tag = /<\/?([\w-]+)([^>]*?)(\/?)>/g;
  let at = 0;
  for (const match of markup.matchAll(tag)) {
    const [whole, name = '', attributes = '', selfClosing = ''] = match;
    push(markup.slice(at, match.index), 'plain');
    push(whole.startsWith('</') ? '</' : '<', 'plain');
    push(name, 'tag');
    for (const part of attributes.split(/(\s+|="[^"]*")/)) {
      if (/^="/.test(part)) {
        push('=', 'plain');
        push(part.slice(1), 'string');
      } else {
        push(part, /^\s*$/.test(part) ? 'plain' : 'attribute');
      }
    }
    push(`${selfClosing}>`, 'plain');
    at = match.index + whole.length;
  }
  push(markup.slice(at), 'plain');
  return tokens;
}
