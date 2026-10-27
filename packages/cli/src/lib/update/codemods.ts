import { posix } from 'node:path';
import type { RegistryItem } from '@ndop/schema';
import { Node, Project, SyntaxKind } from 'ts-morph';
import { aliasPrefix, type InstallContext } from '../install/project-files';
import { compareVersions } from '../registry/version';
import { CliError } from '../errors';

/** One codemod from an item (ADR-0020). */
export type Codemod = NonNullable<RegistryItem['codemods']>[number];

/** The parts of `@angular/compiler` the `rename-input` codemod uses. */
export interface AngularCompiler {
  /** Parses a template into its AST. */
  parseTemplate(
    template: string,
    url: string,
    options: { preserveWhitespaces?: boolean },
  ): { nodes: unknown[]; errors?: unknown[] | null };
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
  references?: { value: string; valueSpan?: Span }[];
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
          if (codemod.renameExportAs) {
            for (const reference of element.references ?? []) {
              if (reference.value === codemod.from)
                rename(reference.valueSpan, codemod.to);
            }
          }
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
    const name = decorator.getName();
    const importedComponent = file
      .getImportDeclarations()
      .filter((item) => item.getModuleSpecifierValue() === '@angular/core')
      .flatMap((item) => item.getNamedImports())
      .find(
        (item) =>
          item.getName() === 'Component' &&
          (item.getAliasNode()?.getText() ?? item.getName()) === name,
      );
    if (name !== 'Component' && !importedComponent) continue;
    const [options] = decorator.getArguments();
    if (!Node.isObjectLiteralExpression(options)) continue;
    const property = options.getProperty('template');
    if (!Node.isPropertyAssignment(property)) continue;
    let literal = property.getInitializer();
    if (Node.isIdentifier(literal)) {
      literal = file
        .getVariableDeclaration(literal.getText())
        ?.getInitializer();
    }
    if (
      !Node.isStringLiteral(literal) &&
      !Node.isNoSubstitutionTemplateLiteral(literal)
    ) {
      if (codemods.some((mod) => mod.kind === 'native-dialog'))
        throw new CliError(
          `${path}: native dialog migration needs a literal inline template or a local literal template constant. Migrate computed or imported templates manually first.`,
        );
      continue;
    }
    const start = literal.getStart() + 1;
    const end = literal.getEnd() - 1;
    const template = literal.getLiteralValue();
    const renamed = nativeDialogs(
      compiler,
      renameInputs(compiler, template, codemods),
      codemods,
    );
    if (renamed !== template) {
      const quote = text[literal.getStart()];
      const escaped = renamed
        .replace(/\\/g, '\\\\')
        .replace(
          quote === '`' ? /`/g : quote === '"' ? /"/g : /'/g,
          (value) => `\\${value}`,
        )
        .replace(quote === '`' ? /\$\{/g : /\r?\n/g, (value) =>
          quote === '`' ? '\\${' : value === '\n' ? '\\n' : '\\r\\n',
        );
      edits.push({ start, end, text: escaped });
    }
  }
  let result = text;
  for (const edit of [
    ...new Map(edits.map((edit) => [edit.start, edit])).values(),
  ].sort((a, b) => b.start - a.start)) {
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

/**
 * Moves imports and re-exports of forwarding directives to their primitive.
 * Keeps local names, including type-only imports, and explicit barrel aliases.
 * Namespace imports cannot be split safely and stop preparation before writes.
 *
 * @param context - The project's import aliases.
 * @param path - Project-relative TypeScript path.
 * @param text - Original source.
 * @param modules - Item module paths without extensions.
 * @param codemods - Export moves crossed by this update.
 * @returns Source with only the affected declarations changed.
 */
export function moveExports(
  context: InstallContext,
  path: string,
  text: string,
  modules: readonly string[],
  codemods: readonly Codemod[],
): string {
  const moves = codemods.filter((mod) => mod.kind === 'move-export');
  if (!moves.length) return text;
  const file = new Project({ useInMemoryFileSystem: true }).createSourceFile(
    `/${path}`,
    text,
  );
  const fromItem = (specifier: string) => {
    const resolved = resolveSpecifier(context, path, specifier);
    return modules.some(
      (module) => resolved === module || resolved === `${module}.ts`,
    );
  };
  for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expression = call.getExpression().getText();
    const [argument] = call.getArguments();
    if (
      (expression === 'import' || expression === 'require') &&
      Node.isStringLiteral(argument) &&
      fromItem(argument.getLiteralValue())
    ) {
      throw new CliError(
        `${path}: replace dynamic or require imports of ${argument.getLiteralValue()} with named imports before updating native overlays.`,
      );
    }
  }
  let changed = false;
  for (const declaration of file.getImportDeclarations()) {
    if (!fromItem(declaration.getModuleSpecifierValue())) continue;
    if (declaration.getNamespaceImport()) {
      throw new CliError(
        `${path}: replace the namespace import from ${declaration.getModuleSpecifierValue()} with named imports before updating native overlays.`,
      );
    }
    for (const specifier of declaration.getNamedImports()) {
      const move = moves.find((mod) => mod.from === specifier.getName());
      if (!move) continue;
      const local = specifier.getAliasNode()?.getText() ?? specifier.getName();
      const typeOnly = declaration.isTypeOnly() || specifier.isTypeOnly();
      const destination = file
        .getImportDeclarations()
        .find(
          (item) =>
            item.getModuleSpecifierValue() === move.module &&
            !item.getNamespaceImport() &&
            item.isTypeOnly() === typeOnly,
        );
      const named = {
        name: move.to,
        alias: local === move.to ? undefined : local,
      };
      if (destination) destination.addNamedImport(named);
      else
        file.addImportDeclaration({
          moduleSpecifier: move.module,
          isTypeOnly: typeOnly,
          namedImports: [named],
        });
      specifier.remove();
      changed = true;
    }
    if (
      !declaration.getNamedImports().length &&
      !declaration.getDefaultImport()
    )
      declaration.remove();
  }
  for (const declaration of file.getExportDeclarations()) {
    const source = declaration.getModuleSpecifierValue();
    if (!source || !fromItem(source)) continue;
    if (declaration.getNamespaceExport())
      throw new CliError(
        `${path}: replace the namespace re-export from ${source} with named exports before updating native overlays.`,
      );
    const named = declaration.getNamedExports();
    if (!named.length) {
      // Explicit exports override the star; retained styled exports still flow through it.
      for (const move of moves) {
        if (
          file
            .getExportDeclarations()
            .some(
              (item) =>
                item.getModuleSpecifierValue() === move.module &&
                item
                  .getNamedExports()
                  .some(
                    (named) =>
                      named.getName() === move.to &&
                      (named.getAliasNode()?.getText() ?? named.getName()) ===
                        move.from,
                  ),
            )
        )
          continue;
        file.addExportDeclaration({
          moduleSpecifier: move.module,
          isTypeOnly: declaration.isTypeOnly(),
          namedExports: [{ name: move.to, alias: move.from }],
        });
      }
      changed = true;
      continue;
    }
    for (const specifier of named) {
      const move = moves.find((mod) => mod.from === specifier.getName());
      if (!move) continue;
      file.addExportDeclaration({
        moduleSpecifier: move.module,
        isTypeOnly: declaration.isTypeOnly() || specifier.isTypeOnly(),
        namedExports: [
          {
            name: move.to,
            alias: specifier.getAliasNode()?.getText() ?? specifier.getName(),
          },
        ],
      });
      specifier.remove();
      changed = true;
    }
    if (!declaration.getNamedExports().length) declaration.remove();
  }
  return changed ? file.getFullText() : text;
}

/** Template AST node fields used for native content migration. */
interface NativeElement extends TemplateElement {
  sourceSpan: Span;
  startSourceSpan?: Span;
  endSourceSpan?: Span | null;
  children?: unknown[];
}

/**
 * Migrates modal tags and ordinary static backdrop classes. Complex overlays
 * require manual review; throwing during plan preparation leaves disk untouched.
 * Lazy portal templates remain supported by the primitive compatibility API.
 *
 * @param compiler - The project's Angular parser.
 * @param template - Inline or external HTML.
 * @param codemods - Modal migrations.
 * @returns HTML with native dialog content and backdrop utilities.
 */
export function nativeDialogs(
  compiler: AngularCompiler,
  template: string,
  codemods: readonly Codemod[],
): string {
  let result = template;
  for (const mod of codemods) {
    if (
      mod.kind !== 'native-dialog' ||
      (!result.includes(mod.from) && !result.includes(mod.overlay))
    )
      continue;
    const parsed = compiler.parseTemplate(result, 'template.html', {
      preserveWhitespaces: true,
    });
    if (parsed.errors?.length)
      throw new CliError(
        'Cannot migrate native dialogs in an invalid Angular template. Fix template parse errors first.',
      );
    const edits: { start: number; end: number; text: string }[] = [];
    const attribute = (node: NativeElement, name: string) =>
      node.attributes?.some((attr) => attr.name === name) ||
      node.inputs?.some((input) => input.name === name);
    const visit = (nodes: unknown[]) => {
      const elements = nodes.filter(
        (node): node is NativeElement =>
          !!node &&
          typeof node === 'object' &&
          !!(node as NativeElement).name &&
          !!(node as NativeElement).attributes,
      );
      const contents = elements.filter((node) => attribute(node, mod.from));
      const overlays = elements.filter((node) => attribute(node, mod.overlay));
      if (overlays.length && (overlays.length !== 1 || contents.length !== 1))
        throw new CliError(
          `Cannot pair ${mod.overlay} with ${mod.from}. Put each overlay and its content together or migrate the backdrop manually.`,
        );
      let backdrop = '';
      for (const overlay of overlays) {
        if (
          overlay.inputs.length ||
          overlay.outputs.length ||
          overlay.references?.length ||
          overlay.attributes.some(
            (attr) => ![mod.overlay, 'class'].includes(attr.name),
          ) ||
          overlay.children?.some(
            (child) =>
              typeof (child as { value?: unknown }).value !== 'string' ||
              String((child as { value: string }).value).trim(),
          )
        ) {
          throw new CliError(
            `Custom ${mod.overlay} behavior cannot be moved automatically. Migrate it to the dialog ::backdrop before updating.`,
          );
        }
        backdrop =
          overlay.attributes.find((attr) => attr.name === 'class')?.value ?? '';
        // Arbitrary values may contain spaces; splitting them would corrupt CSS.
        if (
          /[[\]{}]/.test(backdrop) ||
          backdrop
            .split(/\s+/)
            .filter(Boolean)
            .some(
              (name) =>
                !/^(?:[\w-]+:)*(?:bg-|opacity-|backdrop-|duration-|transition|animate-|ease-|delay-|hidden$|block$|invisible$|visible$)/.test(
                  name,
                ),
            )
        )
          throw new CliError(
            `Review custom or arbitrary ${mod.overlay} classes and move them to backdrop: utilities before updating.`,
          );
        edits.push({
          start: overlay.sourceSpan.start.offset,
          end: overlay.sourceSpan.end.offset,
          text: '',
        });
      }
      for (const content of contents) {
        if (!content.startSourceSpan || !content.endSourceSpan)
          throw new CliError(
            `${mod.from} must have explicit opening and closing tags.`,
          );
        const start = content.startSourceSpan.start.offset;
        const end = content.startSourceSpan.end.offset;
        let opening = result.slice(start, end);
        opening = opening.replace(/^<[^\s>]+/, '<dialog');
        if (backdrop) {
          if (content.inputs.some((input) => input.name === 'class'))
            throw new CliError(
              `Move ${mod.overlay} classes into the bound ${mod.from} class expression before updating.`,
            );
          const classes = backdrop
            .split(/\s+/)
            .filter(Boolean)
            .map((name) => `backdrop:${name}`)
            .join(' ');
          if (/\bclass\s*=/.test(opening))
            opening = opening.replace(
              /(\bclass\s*=\s*)(["'])(.*?)\2/s,
              (_all, prefix: string, quote: string, value: string) =>
                `${prefix}${quote}${value} ${classes}${quote}`,
            );
          else opening = opening.replace(/>$/, ` class="${classes}">`);
        }
        if (opening !== result.slice(start, end))
          edits.push({ start, end, text: opening });
        const closeStart = content.endSourceSpan.start.offset;
        const closeEnd = content.endSourceSpan.end.offset;
        if (result.slice(closeStart, closeEnd) !== '</dialog>')
          edits.push({ start: closeStart, end: closeEnd, text: '</dialog>' });
      }
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        for (const key of [
          'children',
          'branches',
          'cases',
          'empty',
          'placeholder',
          'loading',
          'error',
        ]) {
          const child = (node as Record<string, unknown>)[key];
          if (Array.isArray(child)) visit(child);
          else if (child && typeof child === 'object') visit([child]);
        }
      }
    };
    visit(parsed.nodes);
    for (const edit of edits.sort((a, b) => b.start - a.start))
      result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
}
