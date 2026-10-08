import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { changeList, changelogMarkdown, diffCode } from './changelog';

/** The registry build's output, which the docs build reads. */
const registry = join(import.meta.dirname, '../../../dist/registry/r');
const read = <T>(file: string): T =>
  JSON.parse(readFileSync(join(registry, file), 'utf-8')) as T;

const none = { added: [], changed: [], removed: [] };

describe('diffCode', () => {
  it('marks changed lines, with context and a separator between hunks', () => {
    const before = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'].join(
      '\n',
    );
    const after = before.replace('b', 'B').replace('j', 'J');
    const diff = diffCode(before, after, '{ui}/x/x.ts');
    expect(diff.code.split('\n')).toEqual([
      'a',
      'b',
      'B',
      'c',
      'd',
      'e',
      '// ⋯',
      'g',
      'h',
      'i',
      'j',
      'J',
      'k',
    ]);
    expect([...diff.marks]).toEqual([
      [2, 'remove'],
      [3, 'add'],
      [11, 'remove'],
      [12, 'add'],
    ]);
  });

  it('shows a new file as added lines, and uses HTML comments for HTML', () => {
    expect(diffCode('', 'x\ny\n', '{ui}/x/x.html').marks).toEqual(
      new Map([
        [1, 'add'],
        [2, 'add'],
      ]),
    );
  });
});

describe('changeList', () => {
  it('says what ndop update does, one sentence per change', () => {
    expect(
      changeList({
        files: {
          added: ['{ui}/a/b.ts'],
          changed: ['{ui}/a/a.ts'],
          removed: ['{ui}/a/old.ts', '{ui}/a/gone.ts'],
        },
        migrations: [{ from: '{ui}/a/old.ts', to: '{ui}/a/b.ts' }],
        codemods: [
          {
            since: '2.0.0',
            kind: 'rename-input',
            selector: '[ndA]',
            from: 'size',
            to: 'scale',
          },
        ],
        dependencies: { ...none, added: ['clsx@^2.1.1'], removed: ['tslib'] },
        registryDependencies: { added: ['utils'], removed: [] },
      }),
    ).toEqual([
      'Updates <code>{ui}/a/a.ts</code>, keeping your edits.',
      'Adds <code>{ui}/a/b.ts</code>.',
      'Moves <code>{ui}/a/old.ts</code> to <code>{ui}/a/b.ts</code>, with your edits.',
      "Leaves <code>{ui}/a/gone.ts</code> to you; it's no longer part of the item.",
      'Renames the <code>size</code> input to <code>scale</code> in your templates, on <code>[ndA]</code>.',
      'Installs <code>clsx@^2.1.1</code>.',
      'No longer needs <code>tslib</code>; remove it if nothing else uses it.',
      'Installs the <code>utils</code> item.',
    ]);
  });
});

describe('changelogMarkdown', () => {
  it("writes Dialog's history with unified diffs", () => {
    const markdown = changelogMarkdown('dialog', read);
    expect(markdown).toMatch(/^# Dialog changelog\n/);
    expect(markdown).toContain('## 0.1.3');
    expect(markdown).toContain(
      '- Updates `{ui}/dialog/dialog.ts`, keeping your edits.',
    );
    expect(markdown).toContain(
      "+    cn('flex flex-col gap-2 text-center sm:text-start', this.class()),",
    );
    expect(markdown).toContain('\n@@\n');
  });
});
