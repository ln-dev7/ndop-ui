import { spawnSync } from 'child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Options as PrettierOptions } from 'prettier';
import { threeWayMerge, type MergeOutcome, type MergeStrategy } from './merge';

/**
 * One way of running the merge that the spike measures.
 */
export interface SpikeVariant {
  /** Column label in the report. */
  label: string;
  /** Conflict resolution strategy. */
  strategy: MergeStrategy;
  /** Whether base and remote are formatted with the project's Prettier config first. */
  normalize: boolean;
}

/**
 * The variants ADR-0003 asks the spike to compare.
 */
export const SPIKE_VARIANTS: readonly SpikeVariant[] = [
  { label: 'line', strategy: 'line', normalize: false },
  { label: 'line + prettier', strategy: 'line', normalize: true },
  { label: 'line + prettier + union', strategy: 'line+union', normalize: true },
];

/**
 * Outcome of one fixture under one variant.
 */
export interface CaseResult {
  /** Merge status. */
  status: MergeOutcome['status'];
  /** No conflict and byte-identical to `expected.ts`. */
  clean: boolean;
  /** Markers are complete and well-ordered (always true without conflicts). */
  markersValid: boolean;
}

/**
 * Report for one fixture.
 */
export interface CaseReport {
  /** Fixture folder name, such as `01-restyle-variant`. */
  id: string;
  /** What the local edit does. */
  description: string;
  /** Results keyed by variant label. */
  results: Record<string, CaseResult>;
  /** Whether `git merge-file` agrees with the plain `line` variant. */
  agreesWithGit: boolean;
}

/**
 * Full spike report.
 */
export interface SpikeReport {
  /** One entry per fixture, in folder order. */
  cases: CaseReport[];
  /** Clean merges per variant label. */
  cleanCount: Record<string, number>;
}

/**
 * Metadata in each fixture's `case.json`.
 */
interface CaseMeta {
  description: string;
  overlap: string;
  prettier?: PrettierOptions;
}

/**
 * Runs every fixture in `<fixturesDir>/cases` against every variant in
 * {@link SPIKE_VARIANTS}, and cross-checks the plain line merge against
 * `git merge-file`.
 *
 * @param fixturesDir - Folder holding `base.ts`, `remote.ts` and `cases/`.
 * @param projectPrettier - The fixture project's Prettier config; a case's
 *   `prettier` field is layered on top.
 * @param remoteVersion - Version named in conflict markers.
 * @returns The report.
 */
export async function runSpike(
  fixturesDir: string,
  projectPrettier: PrettierOptions,
  remoteVersion: string,
): Promise<SpikeReport> {
  const base = readFileSync(join(fixturesDir, 'base.ts'), 'utf-8');
  const remote = readFileSync(join(fixturesDir, 'remote.ts'), 'utf-8');
  const casesDir = join(fixturesDir, 'cases');
  const cases: CaseReport[] = [];

  for (const id of readdirSync(casesDir).sort()) {
    const dir = join(casesDir, id);
    const meta = JSON.parse(
      readFileSync(join(dir, 'case.json'), 'utf-8'),
    ) as CaseMeta;
    const local = readFileSync(join(dir, 'local.ts'), 'utf-8');
    const expectedPath = join(dir, 'expected.ts');
    const expected = readdirSync(dir).includes('expected.ts')
      ? readFileSync(expectedPath, 'utf-8')
      : undefined;
    const prettier = { ...projectPrettier, ...meta.prettier };

    const results: Record<string, CaseResult> = {};
    let plainLine: MergeOutcome | undefined;
    for (const variant of SPIKE_VARIANTS) {
      const outcome = await threeWayMerge({
        base,
        local,
        remote,
        remoteVersion,
        strategy: variant.strategy,
        prettier: variant.normalize ? prettier : false,
      });
      if (variant.label === 'line') {
        plainLine = outcome;
      }
      results[variant.label] = {
        status: outcome.status,
        clean: outcome.status !== 'conflict' && outcome.content === expected,
        markersValid: markersAreValid(outcome, remoteVersion),
      };
    }

    const git = gitMergeFile(base, local, remote, remoteVersion);
    const agreesWithGit =
      plainLine !== undefined &&
      git.conflict === (plainLine.status === 'conflict') &&
      (git.conflict || git.content === plainLine.content);

    cases.push({ id, description: meta.description, results, agreesWithGit });
  }

  const cleanCount = Object.fromEntries(
    SPIKE_VARIANTS.map(({ label }) => [
      label,
      cases.filter((c) => c.results[label]?.clean).length,
    ]),
  );
  return { cases, cleanCount };
}

/**
 * Renders the report as a Markdown table, the form recorded in ADR-0003.
 *
 * @param report - Output of {@link runSpike}.
 * @returns The table.
 */
export function formatReport(report: SpikeReport): string {
  const labels = SPIKE_VARIANTS.map((v) => v.label);
  const cell = (r: CaseResult | undefined) =>
    r === undefined
      ? '?'
      : r.clean
        ? 'clean'
        : r.status === 'conflict'
          ? 'conflict'
          : 'wrong';
  const rows = report.cases.map(
    (c) =>
      `| ${c.id} | ${labels.map((l) => cell(c.results[l])).join(' | ')} | ${c.agreesWithGit ? 'yes' : 'NO'} |`,
  );
  return [
    `| Case | ${labels.join(' | ')} | git agrees |`,
    `| --- | ${labels.map(() => '---').join(' | ')} | --- |`,
    ...rows,
    `| **Clean** | ${labels.map((l) => `**${report.cleanCount[l]}/${report.cases.length}**`).join(' | ')} | |`,
  ].join('\n');
}

/**
 * Checks that every conflict has an opening, separator and closing marker,
 * in that order.
 *
 * @param outcome - A merge outcome.
 * @param remoteVersion - Version expected in the closing marker.
 * @returns Whether the markers are well formed.
 */
function markersAreValid(
  outcome: MergeOutcome,
  remoteVersion: string,
): boolean {
  const lines = outcome.content.split('\n');
  let state: 'outside' | 'ours' | 'theirs' = 'outside';
  let opened = 0;
  for (const line of lines) {
    if (line === '<<<<<<< local') {
      if (state !== 'outside') return false;
      state = 'ours';
      opened++;
    } else if (line === '=======') {
      if (state !== 'ours') return false;
      state = 'theirs';
    } else if (line === `>>>>>>> ndop@${remoteVersion}`) {
      if (state !== 'theirs') return false;
      state = 'outside';
    }
  }
  return state === 'outside' && opened === outcome.conflictLines.length;
}

/**
 * Runs `git merge-file` on the same inputs, as the reference diff3
 * implementation.
 *
 * @param base - Base content.
 * @param local - Local content.
 * @param remote - Remote content.
 * @param remoteVersion - Version named in the closing marker.
 * @returns Whether git reported conflicts, and its merged output.
 */
function gitMergeFile(
  base: string,
  local: string,
  remote: string,
  remoteVersion: string,
): { conflict: boolean; content: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ndop-merge-spike-'));
  try {
    const paths = {
      local: join(dir, 'local'),
      base: join(dir, 'base'),
      remote: join(dir, 'remote'),
    };
    writeFileSync(paths.local, local);
    writeFileSync(paths.base, base);
    writeFileSync(paths.remote, remote);
    const result = spawnSync(
      'git',
      [
        'merge-file',
        '-p',
        '-L',
        'local',
        '-L',
        'base',
        '-L',
        `ndop@${remoteVersion}`,
        paths.local,
        paths.base,
        paths.remote,
      ],
      { encoding: 'utf-8' },
    );
    // git merge-file exits with the number of conflicts, or a negative
    // number (reported as >127) on error.
    if (result.status === null || result.status > 127) {
      throw new Error(`git merge-file failed: ${result.stderr}`);
    }
    return { conflict: result.status > 0, content: result.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
