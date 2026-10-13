import {
  parseTemplate,
  TmplAstElement,
  TmplAstTemplate,
  type TmplAstNode,
  type ParseSourceSpan,
} from '@angular-eslint/bundled-angular-compiler';
import type { TemplateSource } from './components';
import type { ComponentDoc, Problem } from './types';

/** An element or `ng-template`, the nodes directives sit on. */
type Host = TmplAstElement | TmplAstTemplate;

/** One part of a component, with its selector parsed. */
interface KnownPart {
  component: string;
  part: ComponentDoc['metadata']['parts'][number];
  compounds: { element?: string; attributes: string[] }[];
}

/** `nd*` selectors that come from `@ndop/core`, not the registry. */
const CORE_SELECTORS = ['svg[ndIcon]'];

/** Properties that hold a node's child nodes, control flow included. */
const CHILD_KEYS = [
  'children',
  'branches',
  'cases',
  'groups',
  'empty',
  'placeholder',
  'loading',
  'error',
] as const;

/**
 * Parses a directive selector list into compound selectors.
 *
 * @param selector - Such as `button[ndButton], a[ndButton]`.
 * @returns Element and attribute names, lowercase.
 */
function compounds(selector: string): KnownPart['compounds'] {
  return selector
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const element = /^[a-z][\w-]*/i.exec(part)?.[0]?.toLowerCase();
      return {
        ...(element ? { element } : {}),
        attributes: [...part.matchAll(/\[([^\]=]+)(?:=[^\]]*)?\]/g)].map(
          (match) => (match[1] ?? '').toLowerCase(),
        ),
      };
    });
}

/**
 * Every part of the given components, with parsed selectors.
 *
 * @param docs - Component metadata.
 * @returns The parts.
 */
function partsOf(docs: readonly ComponentDoc[]): KnownPart[] {
  return docs.flatMap(({ name, metadata }) =>
    metadata.parts.map((part) => ({
      component: name,
      part,
      compounds: compounds(part.selector),
    })),
  );
}

/**
 * A host's tag name and attribute names, lowercase: static attributes,
 * bindings and, on `ng-template`, its template attributes.
 *
 * @param host - An element or template.
 * @returns The tag and the names, in source order.
 */
function namesOf(host: Host): HostNames {
  const tag =
    host instanceof TmplAstElement
      ? host.name.replace(/^:[^:]+:/, '')
      : (host.tagName ?? 'ng-template');
  const attributes = [
    ...host.attributes,
    ...host.inputs,
    ...(host instanceof TmplAstTemplate ? host.templateAttrs : []),
  ];
  return {
    tag: tag.toLowerCase(),
    names: attributes.map((attribute) => attribute.name),
  };
}

/** A host's lowercase tag and its attribute names. */
interface HostNames {
  tag: string;
  names: string[];
}

/**
 * Whether a host matches a part's selector.
 *
 * @param host - Tag and attribute names.
 * @param part - The part.
 * @returns True on a match.
 */
function matchesPart(host: HostNames, part: KnownPart): boolean {
  const names = new Set(host.names.map((name) => name.toLowerCase()));
  return part.compounds.some(
    (compound) =>
      (!compound.element || compound.element === host.tag) &&
      compound.attributes.every((attribute) => names.has(attribute)),
  );
}

/**
 * Edit distance between two names, for "did you mean" suggestions.
 *
 * @param a - A name.
 * @param b - Another.
 * @returns The Levenshtein distance.
 */
export function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/**
 * The closest of some names, if any is close enough to be a typo.
 *
 * @param name - What was written.
 * @param candidates - What exists.
 * @returns The closest candidate within a third of the name's length.
 */
function closest(
  name: string,
  candidates: Iterable<string>,
): string | undefined {
  let best: { candidate: string; score: number } | undefined;
  for (const candidate of candidates) {
    const score = distance(name.toLowerCase(), candidate.toLowerCase());
    if (
      score <= Math.max(2, Math.floor(name.length / 3)) &&
      (!best || score < best.score)
    ) {
      best = { candidate, score };
    }
  }
  return best?.candidate;
}

/** HTML attributes that are never a typo of an input. */
const HTML_ATTRIBUTES = new Set(
  'id class style title role type name value href src alt for form size rows cols min max step tabindex hidden disabled placeholder autocomplete required readonly checked multiple pattern target rel lang dir'.split(
    ' ',
  ),
);

/**
 * Checks templates against component metadata (ADR-0018, `validate_usage`):
 *
 * - an `nd*` selector no installed component declares: an uninstalled
 *   component (`usage/not-installed`, with its `ndop add` command) or one
 *   that doesn't exist (`usage/unknown-selector`, with the closest name);
 * - on an Ndop part, an attribute that's a near miss of one of its inputs
 *   (`usage/unknown-input`), a static value outside an input's allowed
 *   values (`usage/invalid-value`), and a required input left unbound
 *   (`usage/missing-input`);
 * - a part outside the part it must sit in (`usage/wrong-nesting`, from
 *   the metadata's `requires`).
 *
 * @param templates - The templates to check.
 * @param installed - Metadata of the installed components.
 * @param available - Metadata of every component the registry offers.
 * @param addCommand - The command that installs a component.
 * @returns The problems found.
 */
export function checkUsage(
  templates: readonly TemplateSource[],
  installed: readonly ComponentDoc[],
  available: readonly ComponentDoc[],
  addCommand: (name: string) => string = (name) => `npx @ndop/cli add ${name}`,
): Problem[] {
  const parts = partsOf(installed);
  const installedNames = new Set(installed.map((doc) => doc.name));
  const others = partsOf(
    available.filter((doc) => !installedNames.has(doc.name)),
  );
  const attributesOf = (list: readonly KnownPart[]) =>
    list.flatMap(({ compounds: selectors }) =>
      selectors.flatMap((selector) => selector.attributes),
    );
  const known = new Set([
    ...attributesOf(parts),
    ...CORE_SELECTORS.flatMap((selector) =>
      compounds(selector).flatMap((compound) => compound.attributes),
    ),
  ]);
  const spelled = [...parts, ...others].flatMap(({ part }) =>
    [...part.selector.matchAll(/\[([^\]=]+)/g)].map((match) => match[1] ?? ''),
  );
  const problems: Problem[] = [];

  for (const template of templates) {
    const parsed = parseTemplate(template.text, template.file, {
      preserveWhitespaces: true,
    });
    const report = (
      span: ParseSourceSpan,
      rule: string,
      message: string,
      fix?: string,
    ) =>
      problems.push({
        file: template.file,
        line: template.start.line + span.start.line + 1,
        column:
          (span.start.line === 0 ? template.start.column : 0) +
          span.start.col +
          1,
        rule: `usage/${rule}`,
        severity: 'error',
        message,
        ...(fix ? { fix } : {}),
      });

    const checkSelectors = (host: Host, names: string[]) => {
      for (const name of names) {
        if (!/^nd[A-Z]/.test(name) || known.has(name.toLowerCase())) continue;
        const owner = others.find(({ compounds: selectors }) =>
          selectors.some((selector) =>
            selector.attributes.includes(name.toLowerCase()),
          ),
        );
        if (owner) {
          report(
            host.startSourceSpan,
            'not-installed',
            `${name} is part of the ${owner.component} component, which isn't installed.`,
            addCommand(owner.component),
          );
          continue;
        }
        const suggestion = closest(name, spelled);
        report(
          host.startSourceSpan,
          'unknown-selector',
          `No Ndop component has ${name}.${suggestion ? ` Did you mean ${suggestion}?` : ''} Search the components instead of guessing.`,
          suggestion ? `Rename ${name} to ${suggestion}.` : undefined,
        );
      }
    };

    const checkPart = (
      host: Host,
      names: HostNames,
      match: KnownPart,
      ancestors: readonly Host[],
    ) => {
      const { part } = match;
      const members = [...part.inputs, ...part.models];
      const memberNames = new Set(members.map((member) => member.name));
      for (const member of members) {
        if (member.required && !names.names.includes(member.name)) {
          report(
            host.startSourceSpan,
            'missing-input',
            `${part.name} requires the ${member.name} input.`,
            `Bind [${member.name}].`,
          );
        }
      }
      for (const attribute of host.attributes) {
        const member = members.find(
          (candidate) => candidate.name === attribute.name,
        );
        if (member?.values && !member.values.includes(attribute.value)) {
          report(
            attribute.sourceSpan,
            'invalid-value',
            `${attribute.name}="${attribute.value}" isn't a ${part.name} ${attribute.name}. Use one of: ${member.values.join(', ')}.`,
          );
        }
      }
      for (const name of names.names) {
        if (
          name.length < 4 ||
          memberNames.has(name) ||
          HTML_ATTRIBUTES.has(name.toLowerCase()) ||
          /^(aria-|data-|nd[A-Z])/.test(name)
        ) {
          continue;
        }
        const suggestion = closest(name, memberNames);
        if (suggestion) {
          report(
            host.startSourceSpan,
            'unknown-input',
            `${part.name} has no input ${name}. Did you mean ${suggestion}?`,
            `Rename ${name} to ${suggestion}.`,
          );
        }
      }
      const requires = part.requires ?? [];
      const enclosed = ancestors.some((ancestor) =>
        requires.some((selector) =>
          matchesPart(namesOf(ancestor), {
            ...match,
            compounds: compounds(selector),
          }),
        ),
      );
      if (requires.length && !enclosed) {
        report(
          host.startSourceSpan,
          'wrong-nesting',
          `${part.name} must be inside ${requires.join(' or ')}.`,
        );
      }
    };

    const visit = (
      nodes: readonly TmplAstNode[],
      ancestors: readonly Host[],
    ) => {
      for (const node of nodes) {
        const host =
          node instanceof TmplAstElement || node instanceof TmplAstTemplate
            ? node
            : undefined;
        if (host) {
          const names = namesOf(host);
          checkSelectors(host, names.names);
          for (const match of parts.filter((part) =>
            matchesPart(names, part),
          )) {
            checkPart(host, names, match, ancestors);
          }
        }
        const record = node as unknown as Record<string, unknown>;
        for (const key of CHILD_KEYS) {
          const value = record[key];
          const children = Array.isArray(value)
            ? (value as TmplAstNode[])
            : value && typeof value === 'object' && 'sourceSpan' in value
              ? [value as TmplAstNode]
              : [];
          visit(children, host ? [...ancestors, host] : ancestors);
        }
      }
    };

    for (const error of parsed.errors ?? []) {
      report(error.span, 'parse-error', error.msg);
    }
    visit(parsed.nodes, []);
  }
  return problems;
}
