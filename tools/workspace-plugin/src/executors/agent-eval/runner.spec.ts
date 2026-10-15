import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Agent, AgentRun } from './agent';
import type { EvalPrompt } from './prompts';
import { accuracy, runEval, summary, type Workspace } from './runner';
import type { VerifyOutput } from './score';

/** A recorded edit: files the scripted agent writes, and how its run ends. */
interface Script {
  files: Record<string, string>;
  run?: Partial<AgentRun>;
}

const prompts: EvalPrompt[] = [
  { id: 1, prompt: 'Settings page', components: ['button'], category: 'page' },
  { id: 2, prompt: 'Sign-in form', components: ['input'], category: 'form' },
];

const GOOD = "import { Button } from '@/ui/button/button';";

/**
 * A scripted agent and an in-memory workspace: each run writes the next
 * script's files, and verify fails any file containing `broken`.
 *
 * @param scripts - Recorded edits, in run order.
 * @returns The agent, the workspace and the prompts the agent saw.
 */
function fakes(scripts: Script[]) {
  const copies = new Map<string, Record<string, string>>();
  const seen: string[] = [];
  const agent: Agent = {
    async run(prompt, cwd) {
      seen.push(prompt);
      const script = scripts.shift() ?? { files: {} };
      Object.assign(copies.get(cwd) ?? {}, script.files);
      return {
        ok: true,
        usageLimited: false,
        timedOut: false,
        turns: 4,
        durationMs: 2000,
        result: 'Done.',
        transcript: '{}',
        ...script.run,
      };
    },
  };
  const workspace: Workspace = {
    copy: async (name) => {
      copies.set(name, {});
      return name;
    },
    changed: async (copy) => Object.keys(copies.get(copy) ?? {}),
    locked: async () => ({ installed: new Set(['button']), files: new Set() }),
    read: async (copy, path) => copies.get(copy)?.[path] ?? '',
    original: async (path) =>
      path === 'src/styles.css'
        ? "@import 'tailwindcss';\n:root {\n  --primary: oklch(0.2 0 0);\n}\n"
        : undefined,
    verify: async (copy, files): Promise<VerifyOutput> => {
      const broken = files.some((file) =>
        copies.get(copy)?.[file]?.includes('broken'),
      );
      return {
        ok: !broken,
        steps: [{ name: 'usage', ok: !broken }],
        problems: broken
          ? [
              {
                rule: 'usage/unknown-selector',
                file: files[0] ?? '',
                line: 1,
                message: 'x',
                severity: 'error',
              },
            ]
          : [],
        screenshots: [],
      };
    },
    keep: async () => [],
  };
  return { agent, workspace, seen };
}

let reportDir: string;
beforeEach(async () => {
  reportDir = await mkdtemp(join(tmpdir(), 'agent-eval-'));
});
afterEach(() => rm(reportDir, { recursive: true, force: true }));

const options = () => ({
  prompts,
  repeat: 1,
  model: 'claude-sonnet-5',
  reportDir,
  resume: false,
});

describe('runEval', () => {
  it('scores each prompt and writes the report as it goes', async () => {
    const { agent, workspace } = fakes([
      { files: { 'src/app/settings.ts': GOOD } },
      { files: { 'src/app/sign-in.ts': `${GOOD} broken` } },
    ]);
    const report = await runEval(options(), agent, workspace);
    expect(report.results.map((result) => [result.id, result.passed])).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(
      report.results[1]?.checks
        .filter((check) => !check.ok)
        .map((check) => check.name),
    ).toEqual(['verify', 'components']);
    expect(accuracy(report)).toBe(0.5);
    const saved = JSON.parse(
      await readFile(join(reportDir, 'report.json'), 'utf-8'),
    );
    expect(saved.results).toHaveLength(2);
    expect(await readFile(join(reportDir, 'summary.md'), 'utf-8')).toContain(
      '**Accuracy: 1/2 (50.0%)**',
    );
  });

  it('stops at the usage limit and resumes from the first unfinished prompt', async () => {
    const first = fakes([
      { files: { 'src/app/settings.ts': GOOD } },
      {
        files: {},
        run: { ok: false, usageLimited: true, result: 'usage limit reached' },
      },
    ]);
    const stopped = await runEval(options(), first.agent, first.workspace);
    expect(stopped.stopped).toBe('usage-limit');
    expect(stopped.results).toHaveLength(1);
    expect(summary(stopped)).toContain(
      'stopped at the usage limit; resume with --resume',
    );

    const second = fakes([
      {
        files: {
          'src/app/sign-in.ts': "import { Input } from '@/ui/input/input';",
        },
      },
    ]);
    const resumed = await runEval(
      { ...options(), resume: true },
      second.agent,
      second.workspace,
    );
    expect(second.seen).toEqual(['Sign-in form']);
    expect(resumed.stopped).toBeUndefined();
    expect(resumed.results.map((result) => result.id)).toEqual([1, 2]);
  });

  it('runs again, on resume, attempts scored while the limit went unnoticed', async () => {
    const first = fakes([
      { files: { 'src/app/settings.ts': GOOD } },
      {
        files: {},
        run: {
          ok: false,
          usageLimited: false,
          result: "You've hit your session limit · resets 5:10am",
        },
      },
    ]);
    const scored = await runEval(options(), first.agent, first.workspace);
    expect(scored.results).toHaveLength(2);

    const second = fakes([
      {
        files: {
          'src/app/sign-in.ts': "import { Input } from '@/ui/input/input';",
        },
      },
    ]);
    const resumed = await runEval(
      { ...options(), resume: true },
      second.agent,
      second.workspace,
    );
    expect(second.seen).toEqual(['Sign-in form']);
    expect(resumed.results.map((result) => result.id)).toEqual([1, 2]);
    expect(resumed.results[1]?.error).toBeUndefined();
  });

  it("scores the agent's own stylesheets, not the theme it started with", async () => {
    const { agent, workspace } = fakes([
      {
        files: {
          'src/app/settings.ts': GOOD,
          'src/styles.css':
            "@import 'tailwindcss';\n@import './app/app.css';\n:root {\n  --primary: oklch(0.2 0 0);\n}\n",
        },
      },
      {
        files: {
          'src/app/sign-in.ts': "import { Input } from '@/ui/input/input';",
          'src/app/app.css': '.shell {\n  --brand: #0f172a;\n}\n',
        },
      },
    ]);
    const report = await runEval(options(), agent, workspace);
    expect(report.results.map((result) => result.passed)).toEqual([
      true,
      false,
    ]);
    expect(
      report.results[1]?.checks.find((check) => check.name === 'styles'),
    ).toEqual({
      name: 'styles',
      ok: false,
      detail:
        'Colors or CSS variables of its own: src/app/app.css (#0f172a, --brand).',
    });
  });

  it('runs each prompt several times with repeat', async () => {
    const { agent, workspace, seen } = fakes([]);
    const report = await runEval(
      { ...options(), prompts: [prompts[0] as EvalPrompt], repeat: 3 },
      agent,
      workspace,
    );
    expect(seen).toHaveLength(3);
    expect(report.results.map((result) => result.attempt)).toEqual([1, 2, 3]);
  });

  it('fails a run the agent itself failed, such as a timeout', async () => {
    const { agent, workspace } = fakes([
      {
        files: { 'src/app/settings.ts': GOOD },
        run: { ok: false, timedOut: true, result: 'Stopped after 15 minutes.' },
      },
    ]);
    const report = await runEval(
      { ...options(), prompts: [prompts[0] as EvalPrompt] },
      agent,
      workspace,
    );
    expect(report.results[0]).toEqual(
      expect.objectContaining({
        passed: false,
        error: 'Stopped after 15 minutes.',
      }),
    );
  });
});
