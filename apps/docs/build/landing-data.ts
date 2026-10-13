import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ShikiTransformer } from 'shiki';
// Vite bundles this file with its config, and that bundler resolves
// neither tsconfig paths nor unbuilt workspace packages, so the merge and
// the reader type are imported by path, as changelog.ts does.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { threeWayMerge } from '../../../packages/merge/src/index';
// eslint-disable-next-line @nx/enforce-module-boundaries
import type {
  BuiltItem,
  RegistryReader,
} from '../../../packages/metadata/src/lib/markdown';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { BLOCK_CATEGORIES } from '../../../registry/categories';
import type {
  LandingBlock,
  LandingData,
  LandingStep,
} from '../src/app/landing/landing-data';
import { inline } from './part-data';

/** Who changed a line of the merge demo. */
export type LineOwner = 'mine' | 'theirs';

/** A line of the merge demo and how it differs from the installed file. */
export interface DemoLine {
  /** The line's text. */
  text: string;
  /** Added by the reader's edit or upstream, removed, or unchanged. */
  kind?: 'add' | 'remove';
  /** Whose change it is, for added and removed lines. */
  owner?: LineOwner;
}

/** The blocks the landing page shows, in its order (ADR-0026, section 5). */
const LANDING_BLOCKS = [
  'dashboard-01',
  'login-02',
  'settings-01',
  'data-table-01',
  'pricing-01',
  'dashboard-02',
  'settings-02',
  'hero-01',
];

/**
 * Diffs two lists of lines by their longest common subsequence: the lines
 * only `before` has are removed, the ones only `after` has are added.
 *
 * @param before - The lines before.
 * @param after - The lines after.
 * @returns Every line of both, in order, the changed ones marked.
 */
export function lineDiff(before: string[], after: string[]): DemoLine[] {
  // lengths[i * width + j]: the common subsequence's length from i and j on.
  const width = after.length + 1;
  const lengths = new Array<number>((before.length + 1) * width).fill(0);
  const at = (i: number, j: number) => lengths[i * width + j] ?? 0;
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lengths[i * width + j] =
        before[i] === after[j]
          ? at(i + 1, j + 1) + 1
          : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }
  const lines: DemoLine[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    const old = before[i];
    const next = after[j];
    if (old !== undefined && next !== undefined && old === next) {
      lines.push({ text: old });
      i++;
      j++;
    } else if (
      next !== undefined &&
      (old === undefined || at(i, j + 1) >= at(i + 1, j))
    ) {
      lines.push({ text: next, kind: 'add' });
      j++;
    } else if (old !== undefined) {
      lines.push({ text: old, kind: 'remove' });
      i++;
    }
  }
  // A replaced line reads best as the old one, then the new one.
  for (let k = 0; k < lines.length - 1; k++) {
    const line = lines[k];
    const following = lines[k + 1];
    if (line?.kind === 'add' && following?.kind === 'remove') {
      lines[k] = following;
      lines[k + 1] = line;
    }
  }
  return lines;
}

/**
 * The part of the button file the demo shows: its variants, from their
 * declaration to the closing line of the call.
 *
 * @param file - The whole file.
 * @returns Its lines from `const buttonVariants` to `});`.
 */
export function variantsExcerpt(file: string): string[] {
  const lines = file.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.startsWith('const '));
  const end = lines.findIndex((line, index) => index > start && line === '});');
  return lines.slice(start, end + 1);
}

/**
 * Marks whose change each line is, for a diff against the installed file.
 *
 * @param lines - The diff.
 * @param owner - Who made the changes, or a function of the line for the
 *   merged file, whose additions come from either side.
 * @returns The lines, owned.
 */
function own(
  lines: DemoLine[],
  owner: LineOwner | ((text: string) => LineOwner),
): DemoLine[] {
  return lines.map((line) =>
    line.kind
      ? {
          ...line,
          owner: typeof owner === 'function' ? owner(line.text) : owner,
        }
      : line,
  );
}

/**
 * A Shiki transformer that classes each line of the demo with its diff
 * kind and owner, for the landing page's styles.
 *
 * @param lines - The lines, in the highlighted code's order.
 * @returns The transformer.
 */
function demoLines(lines: DemoLine[]): ShikiTransformer {
  return {
    name: 'ndop:landing-merge',
    line(node, number) {
      const line = lines[number - 1];
      if (line?.kind && line.owner) {
        this.addClassToHast(node, ['merge-line', line.kind, line.owner]);
      }
    },
  };
}

/** What {@link landingData} reads. */
export interface LandingDataOptions {
  /** Reads a built registry file. */
  read: RegistryReader;
  /** Highlights code with the docs' Shiki setup. */
  highlight: (
    code: string,
    lang: string,
    meta?: string,
    extra?: ShikiTransformer[],
  ) => Promise<string>;
  /** The workspace's root, for the update fixtures. */
  workspace: string;
  /** Measured gzip sizes by item, from `dist/size/report.json`. */
  gzip: (name: string) => number | undefined;
  /**
   * Whether block thumbnails will exist: a build photographs them after
   * prerendering, the dev server doesn't.
   */
  thumbnails: boolean;
}

/**
 * The landing page's build-time data (ADR-0026): the update demo, built
 * from the merge suite's own Button fixture (`tools/update-fixtures`,
 * case 03: the reader adds an `xl` size while upstream adds `xs`, a
 * `link` variant and a new focus ring) and merged here by `@ndop/merge`
 * exactly as `ndop update` merges it; Tabs' keyboard map; the registry's
 * counts and Button's measured size; and the blocks it shows.
 *
 * @param options - Readers for the registry, the fixtures and sizes.
 * @returns The data, for `virtual:ndop/landing`.
 */
export async function landingData(
  options: LandingDataOptions,
): Promise<LandingData> {
  const fixture = join(options.workspace, 'tools/update-fixtures/button');
  const file = (path: string) => readFileSync(join(fixture, path), 'utf-8');
  const base = file('versions/1.0.0/ui/button/button.ts');
  const remote = file('versions/1.1.0/ui/button/button.ts');
  const local = file('cases/03-add-size/local/src/app/ui/button/button.ts');
  const merged = threeWayMerge({
    base,
    local,
    remote,
    remoteVersion: '1.1.0',
    structural: true,
  });
  if (merged.status !== 'merged') {
    throw new Error(`The landing page's merge demo ${merged.status}`);
  }

  const before = variantsExcerpt(base);
  const yours = new Set(variantsExcerpt(local));
  const steps: [LandingStep['id'], string, string, DemoLine[]][] = [
    [
      'edit',
      'Your edit',
      'You add an xl size to the Button you installed.',
      own(lineDiff(before, variantsExcerpt(local)), 'mine'),
    ],
    [
      'upstream',
      'Upstream fix',
      'Version 1.1.0 thickens the focus ring and adds xs and link.',
      own(lineDiff(before, variantsExcerpt(remote)), 'theirs'),
    ],
    [
      'merged',
      'Merged',
      'ndop update keeps both, using the version you installed as the base.',
      own(lineDiff(before, variantsExcerpt(merged.content)), (text) =>
        yours.has(text) && !before.includes(text) ? 'mine' : 'theirs',
      ).filter((line) => line.kind !== 'remove'),
    ],
  ];

  const tabs = options.read<{
    keyboard: { keys: string[]; action: string }[];
  }>('metadata/tabs.json');
  const items = options.read<{ items: BuiltItem[] }>('index.json').items;
  const count = (type: string) =>
    items.filter((item) => item.type === type).length;

  const blocks: LandingBlock[] = LANDING_BLOCKS.flatMap((name) => {
    const item = items.find(
      (entry) => entry.name === name && entry.type === 'registry:block',
    ) as (BuiltItem & { categories?: string[] }) | undefined;
    if (!item) return [];
    const category = item.categories?.[0] ?? '';
    return [
      {
        name,
        title: item.title,
        category:
          BLOCK_CATEGORIES.find((entry) => entry.slug === category)?.title ??
          category,
      },
    ];
  });

  return {
    merge: {
      file: 'src/app/ui/button/button.ts',
      steps: await Promise.all(
        steps.map(async ([id, title, description, lines]) => ({
          id,
          title,
          description,
          html: await options.highlight(
            lines.map((line) => line.text).join('\n'),
            'angular-ts',
            '',
            [demoLines(lines)],
          ),
        })),
      ),
    },
    keyboard: await Promise.all(
      tabs.keyboard.map(async (row) => ({
        keys: row.keys,
        actionHtml: await inline(row.action),
      })),
    ),
    stats: {
      components: count('registry:ui'),
      blocks: count('registry:block'),
      themes: count('registry:theme'),
      ...(options.gzip('button') === undefined
        ? {}
        : { buttonGzip: options.gzip('button') }),
    },
    blocks,
    thumbnails: options.thumbnails,
  };
}
