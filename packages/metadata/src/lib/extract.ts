import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import type {
  DirectiveEntry,
  DocEntry,
  NgtscProgram,
  PropertyEntry,
} from '@angular/compiler-cli';
import {
  schemas,
  validate,
  type ComponentMetadata,
  type RegistryItem,
} from '@ndop/schema';
import type * as Ts from 'typescript';
import { parseDocs } from './parse-docs';
import { parseSpec, type ParsedSpec, type SpecPart } from './parse-spec';
import { usageOf } from './usage';

/**
 * A problem found while extracting metadata. `ndop build` fails on any.
 */
export interface MetadataIssue {
  /** Item the problem belongs to. */
  item: string;
  /** Registry-relative file, when there is one. */
  file?: string;
  /** What is wrong, written for the registry author. */
  message: string;
}

/**
 * Options for {@link extractMetadata}.
 */
export interface MetadataOptions {
  /** Absolute registry root. */
  root: string;
  /** Built items; `registry:ui` items get metadata, the rest are ignored. */
  items: readonly RegistryItem[];
  /**
   * Absolute path of a tsconfig whose files are the items' TypeScript files
   * and whose `paths` resolve `@/*` and every package they import, as the
   * one `ndop build` writes for its compile check.
   */
  tsconfig: string;
}

/**
 * Outcome of {@link extractMetadata}.
 */
export type MetadataResult =
  | { skipped: true }
  | {
      skipped: false;
      /** One file's content per `registry:ui` item, in item order. */
      metadata: ComponentMetadata[];
      /** Missing descriptions, specs and docs; empty when complete. */
      issues: MetadataIssue[];
    };

/** The `@angular/compiler-cli` exports the extractor uses. */
interface CompilerCli {
  NgtscProgram: typeof NgtscProgram;
  readConfiguration(path: string): {
    rootNames: string[];
    options: Record<string, unknown>;
  };
  createCompilerHost(options: { options: Record<string, unknown> }): unknown;
}

/**
 * Extracts the metadata of every `registry:ui` item (ADR-0007): its parts,
 * with every input, model and output, from Angular's documentation
 * extractor (`NgtscProgram.getApiDocumentation`, as angular.dev uses);
 * inputs forwarded through `hostDirectives`, defaults, enum values and
 * host data attributes from the TypeScript program; the accessibility
 * contract from the composed primitive's `spec.md`; and the intro and agent
 * notes from the item's `docs.md`.
 *
 * `@angular/compiler-cli`, `typescript` and (for bundle sizes) `esbuild`
 * are loaded from the registry root, like the compile check's `ngc`.
 *
 * @param options - Registry root, built items and tsconfig.
 * @returns The metadata and every completeness problem, or `skipped` when
 *   the Angular compiler isn't installed.
 *
 * @example
 * ```ts
 * const result = await extractMetadata({ root, items, tsconfig });
 * if (!result.skipped) for (const m of result.metadata) write(`r/metadata/${m.name}.json`, m);
 * ```
 */
export async function extractMetadata(
  options: MetadataOptions,
): Promise<MetadataResult> {
  const fromRoot = createRequire(join(options.root, 'noop.js'));
  let cli: CompilerCli;
  let ts: typeof Ts;
  try {
    cli = fromRoot('@angular/compiler-cli') as CompilerCli;
    ts = fromRoot('typescript') as typeof Ts;
  } catch {
    return { skipped: true };
  }

  const config = cli.readConfiguration(options.tsconfig);
  const program = new cli.NgtscProgram(
    config.rootNames,
    config.options as never,
    cli.createCompilerHost({ options: config.options }) as never,
  );
  const context: Context = {
    root: options.root,
    ts,
    program,
    checker: program.getTsProgram().getTypeChecker(),
    docs: new Map(),
    fromRoot,
    items: options.items,
  };

  const metadata: ComponentMetadata[] = [];
  const issues: MetadataIssue[] = [];
  for (const item of options.items) {
    if (item.type === 'registry:ui') {
      const result = await extractItem(context, item);
      metadata.push(result.metadata);
      issues.push(...result.issues);
    }
  }
  return { skipped: false, metadata, issues };
}

/**
 * Shared state for one extraction run.
 */
interface Context {
  root: string;
  ts: typeof Ts;
  program: NgtscProgram;
  checker: Ts.TypeChecker;
  /** Documentation entries by absolute file path. */
  docs: Map<string, DocEntry[]>;
  fromRoot: NodeJS.Require;
  /** Every built item, for examples' sources. */
  items: readonly RegistryItem[];
}

/** One part's metadata, as in `metadata.json`. */
type Part = ComponentMetadata['parts'][number];

/** One input, model or output, as in `metadata.json`. */
type Member = NonNullable<Part['inputs']>[number];

/** Which list of a part a member belongs to. */
type MemberKind = 'input' | 'model' | 'output';

/**
 * Extracts one item's metadata.
 *
 * @param context - Extraction state.
 * @param item - A built `registry:ui` item.
 * @returns Its metadata and problems.
 */
async function extractItem(
  context: Context,
  item: RegistryItem,
): Promise<{ metadata: ComponentMetadata; issues: MetadataIssue[] }> {
  const issues: MetadataIssue[] = [];
  const report = (message: string, file?: string) =>
    issues.push({ item: item.name, ...(file ? { file } : {}), message });
  // Typed explicitly: built as a library, @ndop/schema's inferred item
  // type isn't available to this package's emit.
  const files: string[] = (item.files ?? [])
    .map((file: { path: string }) => file.path)
    .filter((path: string) => path.endsWith('.ts'));

  const ownFiles = new Set(files.map((file) => resolve(context.root, file)));
  let composesPrimitive = false;
  const parts: Part[] = [];
  const selectors = new Map<Part, string[]>();
  const classes = new Map<Part, Ts.ClassDeclaration[]>();
  const specs = new Map<string, ParsedSpec>();
  for (const file of files) {
    const absolute = resolve(context.root, file);
    for (const entry of documentation(context, absolute)) {
      if (
        entry.entryType !== 'directive' ||
        parts.some((p) => p.name === entry.name)
      ) {
        continue;
      }
      const directive = entry as DirectiveEntry;
      const declaration = classDeclaration(context, absolute, directive.name);
      const built = buildPart(
        context,
        directive,
        declaration,
        absolute,
        ownFiles,
        specs,
        (m) => report(m, file),
      );
      parts.push(built.part);
      selectors.set(built.part, built.selectors);
      classes.set(built.part, built.classes);
      composesPrimitive ||= built.composes;
    }
  }

  addRequires(context, parts, classes);

  const spec = mergeSpecs([...specs.values()]);
  for (const part of parts) {
    applySpec(part, selectors.get(part) ?? [part.selector], spec?.parts ?? []);
  }
  if (!spec && composesPrimitive) {
    report('No spec.md was found for the primitive the item composes.');
  }

  const docsFile = join(dirname(files[0] ?? ''), 'docs.md');
  let docs = {
    keywords: [] as string[],
    intro: '',
    do: [] as string[],
    dont: [] as string[],
  };
  try {
    docs = parseDocs(readFileSync(join(context.root, docsFile), 'utf-8'));
  } catch {
    report('docs.md is missing.', docsFile);
  }
  if (!docs.intro)
    report('docs.md has no intro before its first heading.', docsFile);
  if (docs.do.length === 0) report('docs.md has no "## Do" list.', docsFile);
  if (docs.dont.length === 0)
    report('docs.md has no "## Don\'t" list.', docsFile);

  const bundleSize = await measure(context, files);
  const mainExample = context.items.find(
    (candidate) => candidate.name === item.ndop?.examples?.[0],
  );
  const mainSource: string | undefined = mainExample?.files?.[0]?.content;
  const metadata: ComponentMetadata = {
    $schema: schemas.metadata.$id,
    name: item.name,
    title: item.title,
    description: item.description,
    intro: docs.intro,
    ...(docs.keywords.length ? { keywords: docs.keywords } : {}),
    agentNotes: { do: docs.do, dont: docs.dont },
    ...(spec?.pattern ? { pattern: spec.pattern } : {}),
    parts,
    keyboard: spec?.keyboard ?? [],
    focus: spec?.focus ?? [],
    ...(spec?.rtl ? { rtl: spec.rtl } : {}),
    examples: item.ndop?.examples ?? [],
    ...(mainSource ? { usage: usageOf(context.ts, mainSource) } : {}),
    ...(bundleSize === undefined ? {} : { bundleSize: { gzip: bundleSize } }),
  };

  const checked = validate('metadata', metadata);
  if (!checked.valid) {
    for (const issue of checked.issues) {
      report(`metadata ${issue.path || '/'} ${issue.message}`);
    }
  }
  return { metadata, issues };
}

/**
 * Angular's documentation entries for a file, cached.
 *
 * @param context - Extraction state.
 * @param file - Absolute path.
 * @returns The entries the file exports, re-exports included.
 */
function documentation(context: Context, file: string): DocEntry[] {
  let entries = context.docs.get(file);
  if (!entries) {
    entries = context.program.getApiDocumentation(file, new Set()).entries;
    context.docs.set(file, entries);
  }
  return entries;
}

/**
 * Finds the class declaration behind a name a file exports, following
 * re-exports.
 *
 * @param context - Extraction state.
 * @param file - Absolute path of the exporting file.
 * @param name - Exported name.
 * @returns The declaration, if found.
 */
function classDeclaration(
  context: Context,
  file: string,
  name: string,
): Ts.ClassDeclaration | undefined {
  const source = context.program.getTsProgram().getSourceFile(file);
  const module = source && context.checker.getSymbolAtLocation(source);
  let symbol =
    module &&
    context.checker.getExportsOfModule(module).find((s) => s.name === name);
  if (symbol && symbol.flags & context.ts.SymbolFlags.Alias) {
    symbol = context.checker.getAliasedSymbol(symbol);
  }
  return symbol?.declarations?.find(context.ts.isClassDeclaration);
}

/**
 * Builds one part from its documentation entry and declaration.
 *
 * @param context - Extraction state.
 * @param entry - Angular's entry for the directive.
 * @param declaration - Its class.
 * @param itemFile - Absolute path of the item file exporting it.
 * @param ownFiles - Absolute paths of all the item's files.
 * @param specs - Receives the `spec.md` of each primitive involved.
 * @param report - Records a problem.
 * @returns The part, the selectors its spec row may be listed under (its
 *   own and its primitives'), the classes behind it (its own and its host
 *   directives'), and whether it involves a primitive.
 */
function buildPart(
  context: Context,
  entry: DirectiveEntry,
  declaration: Ts.ClassDeclaration | undefined,
  itemFile: string,
  ownFiles: ReadonlySet<string>,
  specs: Map<string, ParsedSpec>,
  report: (message: string) => void,
): {
  part: Part;
  selectors: string[];
  classes: Ts.ClassDeclaration[];
  composes: boolean;
} {
  const declaredIn = declaration?.getSourceFile().fileName;
  const local = declaredIn !== undefined && ownFiles.has(resolve(declaredIn));
  const members = new Map<string, { kind: MemberKind; member: Member }>();

  for (const member of entry.members as PropertyEntry[]) {
    const added = toMember(context, member, declaration);
    if (added) members.set(added.member.name, added);
  }

  const decorator = decoratorObject(context, declaration);
  const primitives: Ts.ClassDeclaration[] = [];
  for (const host of hostDirectives(context, decorator)) {
    primitives.push(host.declaration);
    const hostFile = host.declaration.getSourceFile().fileName;
    collectSpec(
      context,
      hostFile,
      moduleSpecifier(context, itemFile, host.declaration.name?.text ?? ''),
      specs,
    );
    const hostEntry = documentation(context, hostFile).find(
      (candidate) => candidate.name === host.declaration.name?.text,
    ) as DirectiveEntry | undefined;
    for (const [inner, alias] of host.inputs) {
      const member = (hostEntry?.members as PropertyEntry[] | undefined)?.find(
        (candidate) => (candidate.inputAlias ?? candidate.name) === inner,
      );
      const added =
        member && toMember(context, member, host.declaration, alias);
      if (added) members.set(added.member.name, added);
    }
  }
  if (!local && declaredIn) {
    collectSpec(
      context,
      declaredIn,
      moduleSpecifier(context, itemFile, entry.name),
      specs,
    );
  }

  const description = entry.description.trim();
  if (!description) {
    report(`${entry.name} has no description.`);
  }
  for (const { member } of members.values()) {
    if (!member.description) {
      report(`${entry.name}.${member.name} has no description.`);
    }
  }

  const of = (kind: MemberKind) =>
    [...members.values()]
      .filter((found) => found.kind === kind)
      .map((found) => found.member);
  const part: Part = {
    name: entry.name,
    selector: entry.selector,
    description,
    source: local
      ? 'item'
      : (moduleSpecifier(context, itemFile, entry.name) ?? 'item'),
    ...(entry.exportAs[0] ? { exportAs: entry.exportAs[0] } : {}),
    inputs: of('input'),
    models: of('model'),
    outputs: of('output'),
    dataAttributes: hostDataAttributes(context, decorator),
  };
  return {
    part,
    classes: [...(declaration ? [declaration] : []), ...primitives],
    composes: primitives.length > 0 || !local,
    selectors: [
      entry.selector,
      ...primitives.map((p) => selectorOf(context, p)),
    ],
  };
}

/**
 * Records, on each part, the parts it must sit inside (ADR-0007, amendment
 * 2): those providing something it injects without `optional: true`, such
 * as `NdDialogTitle`'s `inject(ND_DIALOG)`, which `NdDialog` provides.
 * Dependency injection is what breaks when a part is misplaced, so it is
 * the source of truth.
 *
 * @param context - Extraction state.
 * @param parts - The item's parts.
 * @param classes - The classes behind each part.
 */
function addRequires(
  context: Context,
  parts: readonly Part[],
  classes: ReadonlyMap<Part, readonly Ts.ClassDeclaration[]>,
): void {
  const provided = new Map<Part, Set<Ts.Symbol>>();
  for (const part of parts) {
    const tokens = new Set<Ts.Symbol>();
    for (const declaration of classes.get(part) ?? []) {
      for (const token of providedTokens(context, declaration)) {
        tokens.add(token);
      }
    }
    provided.set(part, tokens);
  }
  for (const part of parts) {
    const required = new Set<string>();
    for (const declaration of classes.get(part) ?? []) {
      for (const token of injectedTokens(context, declaration)) {
        for (const other of parts) {
          if (other !== part && provided.get(other)?.has(token)) {
            required.add(other.selector);
          }
        }
      }
    }
    if (required.size) {
      part.requires = [...required].sort();
    }
  }
}

/**
 * What a directive makes injectable: its own class and every token in its
 * `providers`.
 *
 * @param context - Extraction state.
 * @param declaration - The directive's class.
 * @returns The symbols.
 */
function providedTokens(
  context: Context,
  declaration: Ts.ClassDeclaration,
): Ts.Symbol[] {
  const tokens: Ts.Symbol[] = [];
  const own = declaration.name && symbolOf(context, declaration.name);
  if (own) tokens.push(own);
  const providers = property(
    context,
    decoratorObject(context, declaration),
    'providers',
  );
  if (providers && context.ts.isArrayLiteralExpression(providers)) {
    for (const provider of providers.elements) {
      const token = context.ts.isObjectLiteralExpression(provider)
        ? property(context, provider, 'provide')
        : provider;
      const symbol = token && symbolOf(context, token);
      if (symbol) tokens.push(symbol);
    }
  }
  return tokens;
}

/**
 * The tokens a class injects without `optional: true`, from its `inject()`
 * calls.
 *
 * @param context - Extraction state.
 * @param declaration - The class.
 * @returns The symbols.
 */
function injectedTokens(
  context: Context,
  declaration: Ts.ClassDeclaration,
): Ts.Symbol[] {
  const { ts } = context;
  const tokens: Ts.Symbol[] = [];
  const visit = (node: Ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      symbolOf(context, node.expression)?.name === 'inject'
    ) {
      const [token, options] = node.arguments;
      const optional =
        options !== undefined &&
        ts.isObjectLiteralExpression(options) &&
        property(context, options, 'optional')?.kind ===
          ts.SyntaxKind.TrueKeyword;
      const symbol = token && !optional && symbolOf(context, token);
      if (symbol) tokens.push(symbol);
    }
    ts.forEachChild(node, visit);
  };
  for (const member of declaration.members) visit(member);
  return tokens;
}

/**
 * The symbol an expression refers to, following imports and re-exports.
 *
 * @param context - Extraction state.
 * @param node - An identifier or other reference.
 * @returns The symbol, if any.
 */
function symbolOf(context: Context, node: Ts.Node): Ts.Symbol | undefined {
  let symbol = context.checker.getSymbolAtLocation(node);
  if (symbol && symbol.flags & context.ts.SymbolFlags.Alias) {
    symbol = context.checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

/**
 * Turns a documented property into a member, when it is an input, model or
 * output.
 *
 * @param context - Extraction state.
 * @param member - Angular's entry for the property.
 * @param declaration - The class declaring it.
 * @param alias - Public name when forwarded under another name.
 * @returns The member and its kind, or `undefined` for other properties.
 */
function toMember(
  context: Context,
  member: PropertyEntry,
  declaration: Ts.ClassDeclaration | undefined,
  alias?: string,
): { kind: MemberKind; member: Member } | undefined {
  const tags = member.memberTags as string[];
  const isInput = tags.includes('input');
  const isOutput = tags.includes('output');
  if (!isInput && !isOutput) {
    return undefined;
  }
  const property = declaration?.members.find(
    (node): node is Ts.PropertyDeclaration =>
      context.ts.isPropertyDeclaration(node) &&
      node.name.getText() === member.name,
  );
  const value = property && valueType(context, property);
  const values = value && literalValues(context, value);
  const fallback = member.type.replace(
    /^(?:InputSignal|InputSignalWithTransform|ModelSignal|OutputEmitterRef|EventEmitter)<(.*?)(?:, .*)?>$/,
    '$1',
  );
  const initial = property && defaultValue(context, property);
  const entry: Member = {
    name: alias ?? member.inputAlias ?? member.outputAlias ?? member.name,
    type: values
      ? values.map((v) => `'${v}'`).join(' | ')
      : value
        ? context.checker.typeToString(value)
        : fallback,
    ...(initial === undefined ? {} : { default: initial }),
    ...(member.isRequiredInput ? { required: true } : {}),
    ...(values ? { values } : {}),
    description: member.description.trim(),
  };
  return {
    kind: isInput && isOutput ? 'model' : isInput ? 'input' : 'output',
    member: entry,
  };
}

/**
 * The value type a signal input, model or output carries: `T` of
 * `InputSignal<T>`, `InputSignalWithTransform<T, U>`, `ModelSignal<T>` or
 * `OutputEmitterRef<T>`.
 *
 * @param context - Extraction state.
 * @param property - The property.
 * @returns The type, or `undefined` when it isn't a generic wrapper.
 */
function valueType(
  context: Context,
  property: Ts.PropertyDeclaration,
): Ts.Type | undefined {
  const type = context.checker.getTypeAtLocation(property);
  const args =
    type.aliasTypeArguments ??
    (type.flags & context.ts.TypeFlags.Object
      ? context.checker.getTypeArguments(type as Ts.TypeReference)
      : undefined);
  return args?.[0];
}

/**
 * The string literal values of a union type, such as a `variants()` key or
 * `'top' | 'bottom'`.
 *
 * @param context - Extraction state.
 * @param type - A type.
 * @returns The values, or `undefined` unless every member is a string
 *   literal (ignoring `undefined`).
 */
function literalValues(context: Context, type: Ts.Type): string[] | undefined {
  const members = (type.isUnion() ? type.types : [type]).filter(
    (member) => !(member.flags & context.ts.TypeFlags.Undefined),
  );
  if (
    members.length < 2 ||
    !members.every((member) => member.isStringLiteral())
  ) {
    return undefined;
  }
  return members.map((member) => (member as Ts.StringLiteralType).value);
}

/**
 * The default an `input(…)` or `model(…)` initializer gives, as source
 * text.
 *
 * @param context - Extraction state.
 * @param property - The property.
 * @returns The first argument's text, or `undefined` for required inputs
 *   and other initializers.
 */
function defaultValue(
  context: Context,
  property: Ts.PropertyDeclaration,
): string | undefined {
  const call = property.initializer;
  if (!call || !context.ts.isCallExpression(call)) {
    return undefined;
  }
  const callee = call.expression.getText();
  if (!['input', 'model'].includes(callee) || call.arguments.length === 0) {
    return undefined;
  }
  return call.arguments[0]?.getText();
}

/**
 * The object literal passed to a class's `@Directive` or `@Component`.
 *
 * @param context - Extraction state.
 * @param declaration - The class.
 * @returns The literal, if any.
 */
function decoratorObject(
  context: Context,
  declaration: Ts.ClassDeclaration | undefined,
): Ts.ObjectLiteralExpression | undefined {
  for (const modifier of declaration?.modifiers ?? []) {
    if (
      context.ts.isDecorator(modifier) &&
      context.ts.isCallExpression(modifier.expression)
    ) {
      const [argument] = modifier.expression.arguments;
      if (argument && context.ts.isObjectLiteralExpression(argument)) {
        return argument;
      }
    }
  }
  return undefined;
}

/**
 * A property of a decorator object literal.
 *
 * @param context - Extraction state.
 * @param object - The literal.
 * @param name - Property name.
 * @returns Its initializer, if present.
 */
function property(
  context: Context,
  object: Ts.ObjectLiteralExpression | undefined,
  name: string,
): Ts.Expression | undefined {
  const found = object?.properties.find(
    (node): node is Ts.PropertyAssignment =>
      context.ts.isPropertyAssignment(node) &&
      node.name.getText().replace(/['"]/g, '') === name,
  );
  return found?.initializer;
}

/**
 * The directives a class composes through `hostDirectives`, with the inputs
 * it forwards from each.
 *
 * @param context - Extraction state.
 * @param decorator - The class's decorator object.
 * @returns Each host directive's class and its forwarded inputs, as
 *   `[inner name, public name]`.
 */
function hostDirectives(
  context: Context,
  decorator: Ts.ObjectLiteralExpression | undefined,
): { declaration: Ts.ClassDeclaration; inputs: [string, string][] }[] {
  const list = property(context, decorator, 'hostDirectives');
  if (!list || !context.ts.isArrayLiteralExpression(list)) {
    return [];
  }
  const found: {
    declaration: Ts.ClassDeclaration;
    inputs: [string, string][];
  }[] = [];
  for (const element of list.elements) {
    const reference = context.ts.isObjectLiteralExpression(element)
      ? property(context, element, 'directive')
      : element;
    const inputs = context.ts.isObjectLiteralExpression(element)
      ? property(context, element, 'inputs')
      : undefined;
    let symbol = reference && context.checker.getSymbolAtLocation(reference);
    if (symbol && symbol.flags & context.ts.SymbolFlags.Alias) {
      symbol = context.checker.getAliasedSymbol(symbol);
    }
    const declaration = symbol?.declarations?.find(
      context.ts.isClassDeclaration,
    );
    if (!declaration) {
      continue;
    }
    const forwarded: [string, string][] = [];
    if (inputs && context.ts.isArrayLiteralExpression(inputs)) {
      for (const input of inputs.elements) {
        if (context.ts.isStringLiteral(input)) {
          const [inner = '', outer] = input.text
            .split(':')
            .map((part) => part.trim());
          forwarded.push([inner, outer ?? inner]);
        }
      }
    }
    found.push({ declaration, inputs: forwarded });
  }
  return found;
}

/**
 * The selector in a directive class's decorator.
 *
 * @param context - Extraction state.
 * @param declaration - The class.
 * @returns The selector, or an empty string.
 */
function selectorOf(
  context: Context,
  declaration: Ts.ClassDeclaration,
): string {
  const selector = property(
    context,
    decoratorObject(context, declaration),
    'selector',
  );
  return selector && context.ts.isStringLiteralLike(selector)
    ? selector.text
    : '';
}

/**
 * Data attributes set in a decorator's `host`: static ones with their
 * value, such as `data-slot`, and bound ones (`[attr.data-…]`).
 *
 * @param context - Extraction state.
 * @param decorator - The class's decorator object.
 * @returns The attributes.
 */
function hostDataAttributes(
  context: Context,
  decorator: Ts.ObjectLiteralExpression | undefined,
): NonNullable<Part['dataAttributes']> {
  const host = property(context, decorator, 'host');
  if (!host || !context.ts.isObjectLiteralExpression(host)) {
    return [];
  }
  const attributes: NonNullable<Part['dataAttributes']> = [];
  for (const entry of host.properties) {
    if (!context.ts.isPropertyAssignment(entry)) continue;
    const key = entry.name.getText().replace(/['"]/g, '');
    const bound = /^\[attr\.(data-[a-z0-9-]+)\]$/.exec(key)?.[1];
    if (
      /^data-[a-z0-9-]+$/.test(key) &&
      context.ts.isStringLiteralLike(entry.initializer)
    ) {
      attributes.push({ name: key, values: [entry.initializer.text] });
    } else if (bound) {
      attributes.push({ name: bound });
    }
  }
  return attributes;
}

/**
 * The module specifier through which an item file exports a name, for a
 * part defined in a package.
 *
 * @param context - Extraction state.
 * @param file - Absolute path of the item file.
 * @param name - Exported name.
 * @returns Such as `@ndop/primitives/dialog`, if found.
 */
function moduleSpecifier(
  context: Context,
  file: string,
  name: string,
): string | undefined {
  const source = context.program.getTsProgram().getSourceFile(file);
  for (const statement of source?.statements ?? []) {
    const isDeclaration =
      context.ts.isExportDeclaration(statement) ||
      context.ts.isImportDeclaration(statement);
    if (
      isDeclaration &&
      statement.moduleSpecifier &&
      context.ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.getText().includes(name)
    ) {
      return statement.moduleSpecifier.text;
    }
  }
  return undefined;
}

/**
 * Finds and parses the `spec.md` of the primitive a file belongs to: the
 * first one found walking up from the file (a primitive's source, as in
 * Ndop's own repository), else the one an installed package ships next to
 * the entry point the item imports (`@ndop/primitives/dialog` →
 * `@ndop/primitives/dialog/spec.md`), since published typings sit in a
 * flat folder.
 *
 * @param context - Extraction state.
 * @param file - Absolute path of a primitive's source or typings.
 * @param specifier - Module specifier the item imports it through.
 * @param specs - Receives the parsed spec, by path.
 */
function collectSpec(
  context: Context,
  file: string,
  specifier: string | undefined,
  specs: Map<string, ParsedSpec>,
): void {
  let folder = dirname(file);
  while (folder !== dirname(folder) && !folder.endsWith(`${sep}node_modules`)) {
    if (readSpec(join(folder, 'spec.md'), specs)) return;
    folder = dirname(folder);
  }
  const shipped = specifier && packageSpecPath(specifier, context.fromRoot);
  if (shipped) readSpec(shipped, specs);
}

/**
 * Reads and parses a `spec.md` into the collection, once per path.
 *
 * @param path - Absolute path.
 * @param specs - Receives the parsed spec, by path.
 * @returns Whether the file exists.
 */
function readSpec(path: string, specs: Map<string, ParsedSpec>): boolean {
  if (specs.has(path)) return true;
  try {
    specs.set(path, parseSpec(readFileSync(path, 'utf-8')));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

/**
 * Where an installed package ships the `spec.md` of one of its entry
 * points.
 *
 * @param specifier - A package subpath, such as `@ndop/primitives/dialog`.
 * @param fromRoot - Resolves modules from the registry root.
 * @returns Such as `/…/node_modules/@ndop/primitives/dialog/spec.md`, or
 *   `undefined` for relative specifiers, bare package names and packages
 *   that aren't installed.
 */
export function packageSpecPath(
  specifier: string,
  fromRoot: Pick<NodeJS.Require, 'resolve'>,
): string | undefined {
  const match = /^((?:@[^/]+\/)?[^/.@][^/]*)\/(.+)$/.exec(specifier);
  if (!match?.[1] || !match[2]) return undefined;
  try {
    return join(
      dirname(fromRoot.resolve(`${match[1]}/package.json`)),
      match[2],
      'spec.md',
    );
  } catch {
    return undefined;
  }
}

/**
 * Combines the specs of an item's primitives; most items compose one.
 *
 * @param specs - Parsed specs.
 * @returns The combined contract, or `undefined` when there is none.
 */
function mergeSpecs(specs: ParsedSpec[]): ParsedSpec | undefined {
  const [first, ...rest] = specs;
  if (!first) return undefined;
  return rest.reduce<ParsedSpec>(
    (merged, spec) => ({
      ...merged,
      parts: [...merged.parts, ...spec.parts],
      keyboard: [...merged.keyboard, ...spec.keyboard],
      focus: [...merged.focus, ...spec.focus],
      rtl: [merged.rtl, spec.rtl].filter(Boolean).join(' '),
    }),
    first,
  );
}

/**
 * Adds the role and ARIA and data attributes `spec.md` lists for a part,
 * matched by selector (the part's own, or its primitive's).
 *
 * @param part - A part.
 * @param candidates - Selectors the part's row may be listed under.
 * @param specParts - Rows of the specs' parts tables.
 */
function applySpec(
  part: Part,
  candidates: string[],
  specParts: SpecPart[],
): void {
  const normalize = (selector: string) =>
    selector
      .split(',')
      .map((s) => s.trim())
      .sort()
      .join(', ');
  const selectors = new Set(candidates.map(normalize));
  const row = specParts.find((candidate) =>
    selectors.has(normalize(candidate.selector)),
  );
  if (!row) return;
  if (row.role) part.role = row.role;
  if (row.ariaAttributes.length > 0) part.ariaAttributes = row.ariaAttributes;
  const names = new Set<string>(
    (part.dataAttributes ?? []).map(
      (attribute: { name: string }) => attribute.name,
    ),
  );
  for (const name of row.dataAttributes) {
    if (!names.has(name)) {
      part.dataAttributes = [...(part.dataAttributes ?? []), { name }];
    }
  }
}

/**
 * Measures an item's own code: its files bundled with esbuild, minified
 * and gzipped, with Angular, `@ndop/*` and RxJS external.
 *
 * @param context - Extraction state.
 * @param files - Registry-relative TypeScript files.
 * @returns The size in bytes, or `undefined` without esbuild.
 */
async function measure(
  context: Context,
  files: string[],
): Promise<number | undefined> {
  let esbuild: typeof import('esbuild');
  try {
    esbuild = context.fromRoot('esbuild') as typeof import('esbuild');
  } catch {
    return undefined;
  }
  const result = await esbuild.build({
    stdin: {
      contents: files
        .map(
          (file) =>
            `export * from './${relative(context.root, resolve(context.root, file)).split(sep).join('/')}';`,
        )
        .join('\n'),
      resolveDir: context.root,
      loader: 'ts',
    },
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    logLevel: 'silent',
    external: ['@angular/*', '@ndop/*', 'rxjs', 'rxjs/*'],
    plugins: [
      {
        // Items import each other through `@/`, as installed apps do.
        name: 'registry-alias',
        setup(build) {
          build.onResolve({ filter: /^@\// }, (args) => ({
            path: `${resolve(context.root, args.path.slice(2))}.ts`,
          }));
        },
      },
    ],
    // Angular compiles with legacy decorators, which also emit less code.
    tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
  });
  return gzipSync(
    Buffer.concat(result.outputFiles.map((file) => Buffer.from(file.contents))),
  ).length;
}
