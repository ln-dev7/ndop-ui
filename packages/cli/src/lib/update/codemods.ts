import { posix } from 'node:path';
import type { RegistryItem } from '@ndop/schema';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { aliasPrefix, type InstallContext } from '../install/project-files';
import { compareVersions } from '../registry/version';

/** One codemod from an item (ADR-0020). */
export type Codemod = NonNullable<RegistryItem['codemods']>[number];

/** The parts of `@angular/compiler` the `rename-input` codemod uses. */
export interface AngularCompiler {
  /** Parses a template into its AST. */
  parseTemplate(
    template: string,
    url: string,
    options: { preserveWhitespaces?: boolean },
  ): { nodes: unknown[] };
  /** Directive selectors. */
  CssSelector: {
    new (): CssSelectorLike;
    parse(selector: string): CssSelectorLike[];
  };
  /** Matches elements against selectors. */
  SelectorMatcher: new () => {
    addSelectables(selectors: CssSelectorLike[]): void;
    match(selector: CssSelectorLike, callback: null): boolean;
  };
}

/** A selector built from an element, as `@angular/compiler` has it. */
interface CssSelectorLike {
  setElement(name: string): void;
  addAttribute(name: string, value: string): void;
  addClassName(name: string): void;
}

/** A source span, as the template AST has it. */
interface Span {
  start: { offset: number };
  end: { offset: number };
}

/** An element or `<ng-template>` in the template AST. */
interface TemplateElement {
  name?: string;
  tagName?: string | null;
  attributes: { name: string; value: string; keySpan?: Span }[];
  inputs: { name: string; type: number; keySpan: Span }[];
  outputs: { name: string; type: number; keySpan: Span }[];
}

// BindingType.Property and BindingType.TwoWay; Attribute, Class, Style
// and Animation bindings aren't inputs.
const INPUT_BINDINGS = new Set([0, 5]);
// ParsedEventType.Regular; TwoWay events share their input's span.
const REGULAR_EVENT = 0;

/**
 * The codemods an update crosses: those with `since` after the installed
 * version and up to the target (ADR-0020).
 *
 * @param item - The target version, which lists every codemod.
 * @param installed - The installed version.
 * @returns The codemods to run, in the item's order.
 *
 * @example
 * ```ts
 * codemodsBetween(button020, '0.1.0'); // those with since 0.2.0
 * ```
 */
export function codemodsBetween(
  item: RegistryItem,
  installed: string,
): Codemod[] {
  return (item.codemods ?? []).filter(
    (codemod) =>
      compareVersions(codemod.since, installed) > 0 &&
      compareVersions(codemod.since, item.version) <= 0,
  );
}

/**
 * Applies `rename-export` codemods to one TypeScript file: imports and
 * re-exports of the renamed names from the item's files are renamed, and so
 * are the names' uses in the file. An import with its own alias keeps it.
 *
 * @param context - Where files are and how they import each other.
 * @param path - Project path of the file.
 * @param text - Its text.
 * @param modules - Project paths of the item's files, without extension.
 * @param codemods - `rename-export` codemods.
 * @returns The new text; the same text when nothing changed.
 *
 * @example
 * ```ts
 * renameExports(context, 'src/app/page.ts', text, ['src/app/ui/button/button'], codemods);
 * ```
 */
export function renameExports(
  context: InstallContext,
  path: string,
  text: string,
  modules: readonly string[],
  codemods: readonly Codemod[],
): string {
  const renames = new Map(
    codemods
      .filter((codemod) => codemod.kind === 'rename-export')
      .map((codemod) => [codemod.from, codemod.to]),
  );
  if (
    renames.size === 0 ||
    ![...renames.keys()].some((name) => text.includes(name))
  ) {
    return text;
  }
  const file = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: false },
  }).createSourceFile(`/${path}`, text);
  const fromItem = (specifier: string) => {
    const resolved = resolveSpecifier(context, path, specifier);
    return (
      resolved !== undefined &&
      modules.some(
        (module) => resolved === module || resolved === `${module}.ts`,
      )
    );
  };
  let changed = false;
  for (const declaration of file.getImportDeclarations()) {
    if (!fromItem(declaration.getModuleSpecifierValue())) continue;
    for (const specifier of declaration.getNamedImports()) {
      const to = renames.get(specifier.getName());
      if (!to) continue;
      changed = true;
      const name = specifier.getNameNode();
      if (specifier.getAliasNode() || !Node.isIdentifier(name)) {
        specifier.setName(to);
      } else {
        name.rename(to);
      }
    }
  }
  for (const declaration of file.getExportDeclarations()) {
    const specifier = declaration.getModuleSpecifierValue();
    if (specifier === undefined || !fromItem(specifier)) continue;
    for (const named of declaration.getNamedExports()) {
      const to = renames.get(named.getName());
      if (!to) continue;
      changed = true;
      named.setName(to);
    }
  }
  return changed ? file.getFullText() : text;
}

/**
 * Applies `rename-input` codemods to a template: on elements matching the
 * codemod's selector, the attribute `from` and its `[from]`, `bind-from`,
 * `(fromChange)` and `[(from)]` bindings are renamed.
 *
 * @param compiler - The project's `@angular/compiler`.
 * @param template - Template text.
 * @param codemods - `rename-input` codemods.
 * @returns The new template; the same text when nothing changed.
 */
export function renameInputs(
  compiler: AngularCompiler,
  template: string,
  codemods: readonly Codemod[],
): string {
  const edits = new Map<number, { end: number; text: string }>();
  for (const codemod of codemods) {
    if (codemod.kind !== 'rename-input') continue;
    if (!template.includes(codemod.from)) continue;
    const matcher = new compiler.SelectorMatcher();
    matcher.addSelectables(compiler.CssSelector.parse(codemod.selector));
    const { nodes } = compiler.parseTemplate(template, 'template.html', {
      preserveWhitespaces: true,
    });
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const element = node as Partial<TemplateElement>;
      if (element.attributes && element.inputs && element.outputs) {
        if (matches(compiler, matcher, element as TemplateElement)) {
          const rename = (span: Span | undefined, text: string) => {
            if (span) {
              edits.set(span.start.offset, { end: span.end.offset, text });
            }
          };
          for (const attribute of element.attributes) {
            if (attribute.name === codemod.from) {
              rename(attribute.keySpan, codemod.to);
            }
          }
          for (const input of element.inputs) {
            if (input.name === codemod.from && INPUT_BINDINGS.has(input.type)) {
              rename(input.keySpan, codemod.to);
            }
          }
          for (const output of element.outputs) {
            if (
              output.name === `${codemod.from}Change` &&
              output.type === REGULAR_EVENT
            ) {
              rename(output.keySpan, `${codemod.to}Change`);
            }
          }
        }
      }
      for (const key of [
        'children',
        'branches',
        'cases',
        'empty',
        'placeholder',
        'loading',
        'error',
      ]) {
        const value = (node as Record<string, unknown>)[key];
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };
    nodes.forEach(visit);
  }
  let result = template;
  for (const [start, { end, text }] of [...edits].sort(([a], [b]) => b - a)) {
    result = result.slice(0, start) + text + result.slice(end);
  }
  return result;
}

/**
 * Applies `rename-input` codemods to the inline templates of a
 * TypeScript file's `@Component` decorators.
 *
 * @param compiler - The project's `@angular/compiler`.
 * @param path - Project path of the file.
 * @param text - Its text.
 * @param codemods - `rename-input` codemods.
 * @returns The new text; the same text when nothing changed.
 */
export function renameInlineInputs(
  compiler: AngularCompiler,
  path: string,
  text: string,
  codemods: readonly Codemod[],
): string {
  if (!text.includes('template')) return text;
  const file = new Project({ useInMemoryFileSystem: true }).createSourceFile(
    `/${path}`,
    text,
  );
  const edits: { start: number; end: number; text: string }[] = [];
  for (const decorator of file.getDescendantsOfKind(SyntaxKind.Decorator)) {
    if (decorator.getName() !== 'Component') continue;
    const [options] = decorator.getArguments();
    if (!Node.isObjectLiteralExpression(options)) continue;
    const property = options.getProperty('template');
    if (!Node.isPropertyAssignment(property)) continue;
    const literal = property.getInitializer();
    if (
      !Node.isStringLiteral(literal) &&
      !Node.isNoSubstitutionTemplateLiteral(literal)
    ) {
      continue;
    }
    const start = literal.getStart() + 1;
    const end = literal.getEnd() - 1;
    const template = text.slice(start, end);
    const renamed = renameInputs(compiler, template, codemods);
    if (renamed !== template) edits.push({ start, end, text: renamed });
  }
  let result = text;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}

/**
 * Whether a template element matches a selector, the way Angular matches
 * directives: on its name, attributes, bound inputs and outputs.
 *
 * @param compiler - The project's `@angular/compiler`.
 * @param matcher - A matcher holding the selector.
 * @param element - The element.
 * @returns True when it matches.
 */
function matches(
  compiler: AngularCompiler,
  matcher: InstanceType<AngularCompiler['SelectorMatcher']>,
  element: TemplateElement,
): boolean {
  const selector = new compiler.CssSelector();
  selector.setElement(element.name ?? element.tagName ?? 'ng-template');
  for (const attribute of element.attributes) {
    selector.addAttribute(attribute.name, attribute.value);
    if (attribute.name.toLowerCase() === 'class') {
      for (const name of attribute.value.split(/\s+/).filter(Boolean)) {
        selector.addClassName(name);
      }
    }
  }
  for (const input of element.inputs) {
    if (INPUT_BINDINGS.has(input.type)) selector.addAttribute(input.name, '');
  }
  for (const output of element.outputs) {
    selector.addAttribute(output.name, '');
  }
  return matcher.match(selector, null);
}

/**
 * The project path an import specifier points at, for relative specifiers
 * and the project's import alias.
 *
 * @param context - Install context.
 * @param from - Project path of the importing file.
 * @param specifier - The module specifier.
 * @returns The path without extension, or `undefined` for packages.
 */
function resolveSpecifier(
  context: InstallContext,
  from: string,
  specifier: string,
): string | undefined {
  if (specifier.startsWith('.')) {
    return posix.normalize(posix.join(posix.dirname(from), specifier));
  }
  const prefix = aliasPrefix(context.config.importAlias ?? '@/');
  if (context.aliasBase !== undefined && specifier.startsWith(prefix)) {
    return posix.normalize(
      posix.join(context.aliasBase, specifier.slice(prefix.length)),
    );
  }
  return undefined;
}
