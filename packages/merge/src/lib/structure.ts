import { conflictLines, mergeLines, toLines } from './lines';

/** One top-level part of a TypeScript file. */
export interface Chunk {
  /**
   * What it declares, such as `class DialogBody`, `import` for the import
   * block, or a position for parts without a name.
   */
  key: string;
  /** Its text: leading comments and decorators, then the statement. */
  text: string;
  /** The whitespace after it, up to the next chunk or the end. */
  gap: string;
}

/** A TypeScript file split into top-level chunks. */
export interface SplitFile {
  /** Whitespace before the first chunk. */
  lead: string;
  /** The chunks, in file order. */
  chunks: Chunk[];
}

/** Statements that end at their closing brace, without a semicolon. */
const BLOCK_DECLARATION =
  /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:class|function|interface|enum|namespace|module)\b/;

/** A declaration's kind and name. */
const NAMED =
  /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(class|function\*?|interface|type|enum|const|let|var|namespace|module)\s+([A-Za-z_$][\w$]*)/;

/** Words after which `/` starts a regular expression, not a division. */
const BEFORE_REGEX = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
]);

/** Words that start a new statement, for files without semicolons. */
const STATEMENT_START =
  /^(?:export|import|const|let|var|function|class|interface|type|enum|declare|abstract|async|namespace|@)\b|^@/;

/**
 * Splits a TypeScript file into its top-level chunks (ADR-0003, amendment
 * 2): each declaration with its leading comments and decorators, the
 * import block as one chunk, and anything else on its own. A small
 * tokenizer finds the boundaries, skipping strings, template literals,
 * comments and regular expressions, so it runs anywhere.
 *
 * @param source - Normalized file text (LF, one final newline).
 * @returns The chunks, or `undefined` when the file can't be split safely:
 *   unbalanced brackets, an unterminated string or comment, or one name
 *   declared in two places.
 *
 * @example
 * ```ts
 * splitTopLevel(text)?.chunks.map((chunk) => chunk.key);
 * // ['import', 'const buttonVariants', 'class Button']
 * ```
 */
export function splitTopLevel(source: string): SplitFile | undefined {
  const spans = statementSpans(source);
  if (!spans) return undefined;
  const raw = spans.map(([start, end], index) => ({
    text: source.slice(start, end),
    gap: source.slice(end, spans[index + 1]?.[0] ?? source.length),
    head: headOf(source.slice(start, end)),
  }));
  if (raw.some((part) => part.head === undefined)) return undefined;

  // Overloads and the import statements become one chunk each.
  const named: { key: string | undefined; text: string; gap: string }[] = [];
  for (const part of raw) {
    const key = keyOf(part.head ?? '');
    const last = named.at(-1);
    if (key !== undefined && last?.key === key) {
      last.text += last.gap + part.text;
      last.gap = part.gap;
    } else {
      named.push({ key, text: part.text, gap: part.gap });
    }
  }

  const chunks: Chunk[] = [];
  const seen = new Set<string>();
  let previous = '^';
  let unnamed = 0;
  for (const part of named) {
    let key = part.key;
    if (key === undefined) {
      key = `~${previous}#${unnamed++}`;
    } else {
      previous = key;
      unnamed = 0;
    }
    if (seen.has(key)) return undefined;
    seen.add(key);
    chunks.push({ key, text: part.text, gap: part.gap });
  }
  return { lead: source.slice(0, spans[0]?.[0] ?? source.length), chunks };
}

/** What {@link structuralMerge} produced. */
export interface StructuralMerge {
  /** The merged file, normalized. */
  text: string;
  /** Whether any conflict was written. */
  conflicted: boolean;
  /** Whether any region kept both sides' insertions. */
  unioned: boolean;
}

/**
 * Merges a TypeScript file by its top-level declarations (ADR-0003,
 * amendment 2): each declaration is line-merged on its own, declarations
 * one side added are kept, and the result follows upstream's order, with
 * the user's new declarations after the one they followed, upstream's new
 * ones first. Keeping declarations apart stops line merge from mixing two
 * similar ones, such as a comment ending up on the wrong declaration.
 *
 * @param base - Normalized base text.
 * @param local - Normalized local text.
 * @param remote - Normalized remote text.
 * @param version - Target version, for conflict markers.
 * @param union - Whether pure insertions on both sides are both kept.
 * @returns The merge, or `undefined` when a side can't be split and line
 *   merge should run instead.
 */
export function structuralMerge(
  base: string,
  local: string,
  remote: string,
  version: string,
  union: boolean,
): StructuralMerge | undefined {
  const b = splitTopLevel(base);
  const l = splitTopLevel(local);
  const r = splitTopLevel(remote);
  if (!b || !l || !r) return undefined;
  const localIds = identities(b, l);
  const remoteIds = identities(b, r);
  const byBase = new Map(b.chunks.map((chunk) => [chunk.key, chunk]));
  const byLocal = new Map(
    l.chunks.map((chunk, index) => [localIds[index] ?? chunk.key, chunk]),
  );
  const byRemote = new Map(
    r.chunks.map((chunk, index) => [remoteIds[index] ?? chunk.key, chunk]),
  );

  let conflicted = false;
  let unioned = false;
  const merge = (ours: string, original: string, theirs: string): string => {
    if (ours === original) return theirs;
    if (theirs === original || ours === theirs) return ours;
    const merged = mergeLines(
      toLines(`${original}\n`),
      toLines(`${ours}\n`),
      toLines(`${theirs}\n`),
      version,
      union,
    );
    conflicted ||= merged.conflicted;
    unioned ||= merged.unioned;
    return merged.lines.join('\n');
  };
  const conflict = (ours: string | undefined, theirs: string | undefined) => {
    conflicted = true;
    return conflictLines(
      ours === undefined ? [] : ours.split('\n'),
      theirs === undefined ? [] : theirs.split('\n'),
      version,
    ).join('\n');
  };

  interface Placed {
    id: string;
    text: string;
    gap: string;
    upstreamNew: boolean;
  }
  const result: Placed[] = [];
  for (const [index, chunk] of r.chunks.entries()) {
    const id = remoteIds[index] ?? chunk.key;
    const original = byBase.get(id);
    const ours = byLocal.get(id);
    let text: string | undefined;
    if (original && ours) text = merge(ours.text, original.text, chunk.text);
    else if (original) {
      // The user deleted it: gone, unless upstream changed it meanwhile.
      text =
        original.text === chunk.text
          ? undefined
          : conflict(undefined, chunk.text);
    } else if (ours) {
      text =
        ours.text === chunk.text ? chunk.text : conflict(ours.text, chunk.text);
    } else {
      text = chunk.text;
    }
    if (text !== undefined) {
      result.push({
        id,
        text,
        gap: chunk.gap,
        upstreamNew: !original && !ours,
      });
    }
  }

  for (const [index, chunk] of l.chunks.entries()) {
    const id = localIds[index] ?? chunk.key;
    if (byRemote.has(id)) continue;
    const original = byBase.get(id);
    let text: string;
    if (original) {
      // Upstream deleted it: gone, unless the user changed it.
      if (original.text === chunk.text) continue;
      text = conflict(chunk.text, undefined);
    } else {
      text = chunk.text;
    }
    let anchor = -1;
    for (let before = index - 1; before >= 0; before--) {
      const previous = localIds[before] ?? l.chunks[before]?.key;
      anchor = result.findIndex((placed) => placed.id === previous);
      if (anchor !== -1) break;
    }
    let at = anchor + 1;
    while (result[at]?.upstreamNew) at++;
    const previousPlaced = result[at - 1];
    if (previousPlaced && at === result.length) {
      // Appending after what was the last chunk: give it the spacing the
      // user's file had before this chunk.
      previousPlaced.gap = l.chunks[index - 1]?.gap ?? '\n\n';
    }
    result.splice(at, 0, { id, text, gap: chunk.gap, upstreamNew: false });
  }

  const text =
    r.lead + result.map((placed) => placed.text + placed.gap).join('');
  return {
    text: `${text.replace(/\n+$/, '')}\n`,
    conflicted,
    unioned,
  };
}

/**
 * Matches each chunk of a newer version to a base chunk: by key, or, for a
 * declaration renamed in place, by its kind and position, so a renamed
 * class merges with its old self instead of conflicting with it.
 *
 * @param base - The base file.
 * @param other - The local or remote file.
 * @returns For each chunk of `other`, the key of the base chunk it
 *   continues, or its own key when it's new.
 */
function identities(base: SplitFile, other: SplitFile): string[] {
  const baseKeys = new Set(base.chunks.map((chunk) => chunk.key));
  const otherKeys = new Set(other.chunks.map((chunk) => chunk.key));
  const slot = (chunks: Chunk[], index: number, keys: Set<string>) => {
    for (let before = index - 1; before >= 0; before--) {
      const key = chunks[before]?.key ?? '';
      if (keys.has(key)) return key;
    }
    return '^';
  };
  const kind = (key: string) => key.split(' ')[0];
  const gone = base.chunks
    .map((chunk, index) => ({
      key: chunk.key,
      slot: slot(base.chunks, index, otherKeys),
    }))
    .filter(({ key }) => !otherKeys.has(key) && !key.startsWith('~'));
  return other.chunks.map((chunk, index) => {
    if (baseKeys.has(chunk.key) || chunk.key.startsWith('~')) return chunk.key;
    const position = slot(other.chunks, index, baseKeys);
    const candidates = gone.filter(
      (entry) => entry.slot === position && kind(entry.key) === kind(chunk.key),
    );
    const rivals = other.chunks.filter(
      (entry, at) =>
        !baseKeys.has(entry.key) &&
        kind(entry.key) === kind(chunk.key) &&
        slot(other.chunks, at, baseKeys) === position,
    );
    return candidates.length === 1 && rivals.length === 1
      ? (candidates[0]?.key ?? chunk.key)
      : chunk.key;
  });
}

/**
 * The key of a chunk from its head.
 *
 * @param head - Its statement, without leading comments and decorators.
 * @returns `import`, `<kind> <name>`, or `undefined` for unnamed parts.
 */
function keyOf(head: string): string | undefined {
  if (/^import\b/.test(head)) return 'import';
  const match = NAMED.exec(head);
  return match ? `${(match[1] ?? '').replace('*', '')} ${match[2]}` : undefined;
}

/**
 * A chunk's statement without its leading comments and decorators.
 *
 * @param text - The chunk's text.
 * @returns The rest, or `undefined` when a decorator is unbalanced.
 */
function headOf(text: string): string | undefined {
  let index = 0;
  for (;;) {
    while (/\s/.test(text[index] ?? '')) index++;
    if (text.startsWith('//', index)) {
      const end = text.indexOf('\n', index);
      index = end === -1 ? text.length : end;
    } else if (text.startsWith('/*', index)) {
      const end = text.indexOf('*/', index + 2);
      if (end === -1) return undefined;
      index = end + 2;
    } else if (text[index] === '@') {
      index++;
      while (/[\w$.]/.test(text[index] ?? '')) index++;
      if (text[index] === '(') {
        const end = skipBalanced(text, index);
        if (end === undefined) return undefined;
        index = end;
      }
    } else {
      return text.slice(index);
    }
  }
}

/**
 * The start and end of each top-level statement, comments before it
 * included and a comment after it on the same line too.
 *
 * @param source - Normalized file text.
 * @returns The spans, or `undefined` when the file can't be tokenized.
 */
function statementSpans(source: string): [number, number][] | undefined {
  const spans: [number, number][] = [];
  const stack: string[] = [];
  let start = -1;
  let index = 0;
  let previous = '';
  let word = '';
  let hasCode = false;

  const close = (end: number) => {
    let stop = end;
    const rest = /^[ \t]*(\/\/[^\n]*)?/.exec(source.slice(stop));
    if (rest?.[1]) stop += rest[0].length;
    spans.push([start, stop]);
    start = -1;
    hasCode = false;
    previous = '';
    word = '';
    return stop;
  };

  while (index < source.length) {
    const char = source[index] ?? '';
    if (/\s/.test(char)) {
      if (
        char === '\n' &&
        start !== -1 &&
        hasCode &&
        stack.length === 0 &&
        !/[=,(+\-*/&|?:.<>[{!~%^]$/.test(previous) &&
        STATEMENT_START.test(source.slice(index + 1).trimStart()) &&
        // Decorators belong to the declaration on the lines below them.
        headOf(source.slice(start, index)) !== ''
      ) {
        index = close(index);
        continue;
      }
      index++;
      continue;
    }
    if (start === -1) start = index;
    const skipped = skipToken(source, index, previous, word);
    if (skipped === undefined) return undefined;
    if (skipped !== index) {
      if (source[index] !== '/' || !'/*'.includes(source[index + 1] ?? '')) {
        hasCode = true;
        previous = source[skipped - 1] ?? '';
        word = '';
      }
      index = skipped;
      continue;
    }
    hasCode = true;
    if ('([{'.includes(char)) stack.push(char);
    if (')]}'.includes(char)) {
      const open = stack.pop();
      if (open !== { ')': '(', ']': '[', '}': '{' }[char]) return undefined;
      if (
        char === '}' &&
        stack.length === 0 &&
        BLOCK_DECLARATION.test(headOf(source.slice(start, index)) ?? '')
      ) {
        index = close(index + 1);
        continue;
      }
    }
    if (char === ';' && stack.length === 0) {
      index = close(index + 1);
      continue;
    }
    if (/[\w$]/.test(char)) {
      word = /[\w$]/.test(previous) ? word + char : char;
    } else {
      word = '';
    }
    previous = char;
    index++;
  }
  if (stack.length > 0) return undefined;
  if (start !== -1) {
    const text = source.slice(start).replace(/\s+$/, '');
    spans.push([start, start + text.length]);
  }
  return spans;
}

/**
 * Skips a string, template literal, comment or regular expression that
 * starts at `index`.
 *
 * @param source - The text.
 * @param index - Where it may start.
 * @param previous - The last significant character before it.
 * @param word - The word ending right before it, if any.
 * @returns The index after it; `index` when nothing starts there;
 *   `undefined` when it never ends.
 */
function skipToken(
  source: string,
  index: number,
  previous: string,
  word: string,
): number | undefined {
  const char = source[index];
  const next = source[index + 1];
  if (char === '/' && next === '/') {
    const end = source.indexOf('\n', index);
    return end === -1 ? source.length : end;
  }
  if (char === '/' && next === '*') {
    const end = source.indexOf('*/', index + 2);
    return end === -1 ? undefined : end + 2;
  }
  if (char === "'" || char === '"') {
    for (let at = index + 1; at < source.length; at++) {
      const current = source[at];
      if (current === '\\') at++;
      else if (current === char) return at + 1;
      else if (current === '\n') return undefined;
    }
    return undefined;
  }
  if (char === '`') {
    for (let at = index + 1; at < source.length; at++) {
      const current = source[at];
      if (current === '\\') at++;
      else if (current === '`') return at + 1;
      else if (current === '$' && source[at + 1] === '{') {
        const end = skipBalanced(source, at + 1);
        if (end === undefined) return undefined;
        at = end - 1;
      }
    }
    return undefined;
  }
  if (
    char === '/' &&
    (previous === '' ||
      '(,=:[!&|?{};+-*%<>~^'.includes(previous) ||
      BEFORE_REGEX.has(word))
  ) {
    let inClass = false;
    for (let at = index + 1; at < source.length; at++) {
      const current = source[at];
      if (current === '\\') at++;
      else if (current === '[') inClass = true;
      else if (current === ']') inClass = false;
      else if (current === '/' && !inClass) {
        let end = at + 1;
        while (/[a-z]/i.test(source[end] ?? '')) end++;
        return end;
      } else if (current === '\n') return undefined;
    }
    return undefined;
  }
  return index;
}

/**
 * Finds the end of a bracketed expression, skipping strings, comments and
 * template literals inside it.
 *
 * @param source - The text.
 * @param open - Index of the opening `(`, `[` or `{`.
 * @returns The index after the matching close, or `undefined`.
 */
function skipBalanced(source: string, open: number): number | undefined {
  let depth = 0;
  let previous = '';
  let word = '';
  for (let index = open; index < source.length; ) {
    const skipped = skipToken(source, index, previous, word);
    if (skipped === undefined) return undefined;
    if (skipped !== index) {
      index = skipped;
      continue;
    }
    const char = source[index] ?? '';
    if ('([{'.includes(char)) depth++;
    if (')]}'.includes(char) && --depth === 0) return index + 1;
    if (!/\s/.test(char)) {
      word = /[\w$]/.test(char)
        ? /[\w$]/.test(previous)
          ? word + char
          : char
        : '';
      previous = char;
    }
    index++;
  }
  return undefined;
}
