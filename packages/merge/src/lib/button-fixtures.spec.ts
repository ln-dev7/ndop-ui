import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { format, type Options } from 'prettier';
import { conflictMarkers, threeWayMerge, type MergeOutcome } from './merge';

// ADR-0003's ten Button cases, kept as the merge's regression suite until the
// update fixture suite (ADR-0020) runs them through the CLI.
const workspaceRoot = join(import.meta.dirname, '../../../..');
const fixtures = join(workspaceRoot, 'tools/update-fixtures/button');
const projectPrettier = JSON.parse(
  readFileSync(join(workspaceRoot, '.prettierrc'), 'utf-8'),
) as Options;
const read = (...path: string[]) =>
  readFileSync(join(fixtures, ...path), 'utf-8');

interface Case {
  id: string;
  local: string;
  expected?: string;
  outcome: MergeOutcome;
  plain: MergeOutcome;
  git: { conflict: boolean; content: string };
}

/**
 * Runs `git merge-file` on the same inputs, the reference diff3.
 *
 * @param base - Base content.
 * @param local - Local content.
 * @param remote - Remote content.
 * @returns Whether git found conflicts, and its output.
 */
function gitMergeFile(base: string, local: string, remote: string) {
  const dir = mkdtempSync(join(tmpdir(), 'ndop-merge-'));
  try {
    const files = { local, base, remote };
    for (const [name, text] of Object.entries(files)) {
      writeFileSync(join(dir, name), text);
    }
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
        'ndop@1.1.0',
      ].concat(['local', 'base', 'remote'].map((name) => join(dir, name))),
      { encoding: 'utf-8' },
    );
    // git merge-file exits with the number of conflicts, or above 127 on
    // error.
    if (result.status === null || result.status > 127) {
      throw new Error(`git merge-file failed: ${result.stderr}`);
    }
    return { conflict: result.status > 0, content: result.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('Button update fixtures (ADR-0003)', () => {
  const cases: Case[] = [];

  beforeAll(async () => {
    for (const id of readdirSync(join(fixtures, 'cases')).sort()) {
      const meta = JSON.parse(read('cases', id, 'case.json')) as {
        prettier?: Options;
      };
      // ndop update formats base and remote the way add formatted the file
      // the user received (ADR-0010, "The pristine file").
      const options = {
        parser: 'typescript',
        ...projectPrettier,
        ...meta.prettier,
      };
      const base = await format(read('base.ts'), options);
      const remote = await format(read('remote.ts'), options);
      const local = read('cases', id, 'local.ts');
      const files = readdirSync(join(fixtures, 'cases', id));
      const merge = (union: boolean) =>
        threeWayMerge({ base, local, remote, remoteVersion: '1.1.0', union });
      cases.push({
        id,
        local,
        ...(files.includes('expected.ts')
          ? { expected: read('cases', id, 'expected.ts') }
          : {}),
        outcome: merge(true),
        plain: merge(false),
        git: gitMergeFile(base, local, remote),
      });
    }
  });

  it('merges nine of the ten cases exactly as expected', () => {
    expect(
      cases
        .filter(
          ({ outcome, expected }) =>
            outcome.status === 'conflict' || outcome.content !== expected,
        )
        .map(({ id }) => id),
    ).toEqual(['10-edit-base-classes']);
  });

  it('leaves the true conflict as one, with well-formed markers', () => {
    const conflict = cases.find(({ id }) => id === '10-edit-base-classes');
    expect(conflict?.outcome.status).toBe('conflict');
    expect(conflictMarkers(conflict?.outcome.content ?? '')).toEqual(
      expect.objectContaining({ count: 1, wellFormed: true }),
    );
  });

  it('agrees with git merge-file when the union is off', () => {
    expect(
      cases
        .filter(
          ({ plain, git }) =>
            git.conflict !== (plain.status === 'conflict') ||
            (!git.conflict && git.content !== plain.content),
        )
        .map(({ id }) => id),
    ).toEqual([]);
  });
});
