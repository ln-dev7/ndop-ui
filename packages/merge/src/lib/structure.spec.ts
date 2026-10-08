import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeText } from './lines';
import { threeWayMerge } from './merge';
import { splitTopLevel, structuralMerge } from './structure';

const workspace = join(import.meta.dirname, '../../../..');

/**
 * Every `.ts` file under a folder.
 *
 * @param folder - Absolute folder.
 * @returns Absolute paths.
 */
function typescriptFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' ? [] : typescriptFiles(path);
    }
    return name.endsWith('.ts') ? [path] : [];
  });
}

const join2 = (split: NonNullable<ReturnType<typeof splitTopLevel>>) =>
  split.lead + split.chunks.map((chunk) => chunk.text + chunk.gap).join('');

describe('splitTopLevel', () => {
  it('splits and rejoins every registry and fixture file exactly', () => {
    const files = [
      ...typescriptFiles(join(workspace, 'registry')),
      ...typescriptFiles(join(workspace, 'tools/update-fixtures')),
      ...typescriptFiles(join(workspace, 'packages/merge/src')),
    ];
    expect(files.length).toBeGreaterThan(50);
    const unsplit = files.filter((file) => {
      const text = normalizeText(readFileSync(file, 'utf-8'));
      const split = splitTopLevel(text);
      return !split || join2(split) !== text;
    });
    expect(unsplit).toEqual([]);
  });

  it('keys declarations, with their comments and decorators', () => {
    const text = `// Header.
import { a } from 'a';
import { b } from 'b';

export const sizes = { sm: 1 };

/** Doc. */
@Directive({ selector: '[x]', host: { '[class]': 'classes()' } })
export class X {
  readonly y = input('}');
}

export type Size = 'sm' | 'lg';

export function f(a: string): string;
export function f(a: number): number;
export function f(a: unknown) {
  return /}/.test(String(a)) ? \`\${a}}\` : a;
}

export { a, b };
`;
    const split = splitTopLevel(text);
    expect(split?.chunks.map((chunk) => chunk.key)).toEqual([
      'import',
      'const sizes',
      'class X',
      'type Size',
      'function f',
      '~function f#0',
    ]);
    expect(split?.chunks[2]?.text.startsWith('/** Doc. */\n@Directive(')).toBe(
      true,
    );
  });

  it('splits files without semicolons, keeping decorators with their class', () => {
    const split = splitTopLevel(
      "import { a } from 'a'\n\n@Component({})\nexport class A {}\n\nexport const b = 1\n",
    );
    expect(split?.chunks.map((chunk) => chunk.key)).toEqual([
      'import',
      'class A',
      'const b',
    ]);
  });

  it('gives up on what it cannot tokenize', () => {
    expect(splitTopLevel("const a = 'open\n")).toBeUndefined();
    expect(splitTopLevel('function f() {\n')).toBeUndefined();
    expect(
      splitTopLevel('const a = 1;\nconst b = 2;\nconst a = 3;\n'),
    ).toBeUndefined();
  });
});

describe('structuralMerge', () => {
  const block = (name: string, body = 'x') =>
    `/** ${name}. */\n@Directive({ selector: '[${name}]' })\nexport class ${name} {\n  readonly class = input('${body}');\n}\n`;
  const file = (...blocks: string[]) =>
    `import { input } from '@angular/core';\n\n${blocks.join('\n')}`;

  it("puts upstream's new declaration before the user's at the same spot", () => {
    const merged = structuralMerge(
      file(block('Header'), block('Title')),
      file(block('Header'), block('Body'), block('Title')),
      file(block('Header'), block('Footer'), block('Title')),
      '1.1.0',
      true,
    );
    expect(merged).toEqual({
      text: file(
        block('Header'),
        block('Footer'),
        block('Body'),
        block('Title'),
      ),
      conflicted: false,
      unioned: false,
    });
  });

  it('keeps comments with their own declaration', () => {
    const undocumented = (name: string) =>
      block(name).replace(`/** ${name}. */\n`, '');
    const merged = structuralMerge(
      file(block('Header'), undocumented('Title')),
      file(block('Header'), block('Body'), undocumented('Title')),
      file(block('Header'), block('Footer'), block('Title')),
      '1.1.0',
      true,
    );
    expect(merged?.text).toBe(
      file(block('Header'), block('Footer'), block('Body'), block('Title')),
    );
  });

  it('appends a new last declaration with the spacing the user had', () => {
    const merged = structuralMerge(
      file(block('A')),
      file(block('A'), block('B')),
      file(block('A', 'y')),
      '1.1.0',
      true,
    );
    expect(merged?.text).toBe(file(block('A', 'y'), block('B')));
  });

  it('merges a declaration the user renamed with its upstream changes', () => {
    const documented = block('B').replace('/** B. */', '/** B, documented. */');
    const renamed = (text: string) => text.replace('class B', 'class AppB');
    const merged = structuralMerge(
      file(block('A'), block('B')),
      file(block('A'), renamed(block('B'))),
      file(block('A'), documented),
      '1.1.0',
      true,
    );
    expect(merged?.text).toBe(file(block('A'), renamed(documented)));
  });

  it('conflicts when one side deletes what the other changed', () => {
    const merged = structuralMerge(
      file(block('A'), block('B')),
      file(block('A')),
      file(block('A'), block('B', 'y')),
      '1.1.0',
      true,
    );
    expect(merged?.conflicted).toBe(true);
    expect(merged?.text).toContain(
      `<<<<<<< local\n=======\n${block('B', 'y').trimEnd()}\n>>>>>>> ndop@1.1.0`,
    );
  });

  it('conflicts when both sides add different declarations with one name', () => {
    const merged = structuralMerge(
      file(block('A')),
      file(block('A'), block('B')),
      file(block('A'), block('B', 'y')),
      '1.1.0',
      true,
    );
    expect(merged?.conflicted).toBe(true);
  });

  it('runs through threeWayMerge only when asked', () => {
    const input = {
      base: file(block('Header'), block('Title')),
      local: file(block('Header'), block('Body'), block('Title')),
      remote: file(block('Header'), block('Footer'), block('Title')),
      remoteVersion: '1.1.0',
    };
    expect(threeWayMerge({ ...input, structural: true }).content).toBe(
      file(block('Header'), block('Footer'), block('Body'), block('Title')),
    );
    expect(threeWayMerge(input).status).not.toBe('conflict');
  });
});
