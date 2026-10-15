import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  addDevCommand,
  agentFileProblems,
  BAD_PAGE_RULES,
  caseId,
  changedPaths,
  execCommand,
  hashTree,
  installableItems,
  lastJsonObject,
  listProblems,
  localCliProblems,
  localCommand,
  run,
  runScriptCommand,
  TEAM_NOTE,
  verifyProblems,
} from './scenario';

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'registry-e2e-spec-'));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe('commands', () => {
  it('names cases by package manager and Angular major', () => {
    expect(caseId({ packageManager: 'pnpm', angular: '21.2.24' })).toBe(
      'pnpm-ng21',
    );
  });

  it('runs bins the way each package manager does', () => {
    expect(execCommand('npm', '@ndop/cli@1.0.0', ['init'])).toEqual([
      'npx',
      ['--yes', '@ndop/cli@1.0.0', 'init'],
    ]);
    expect(execCommand('pnpm', '@ndop/cli@1.0.0', ['init'])).toEqual([
      'pnpm',
      ['dlx', '@ndop/cli@1.0.0', 'init'],
    ]);
    expect(execCommand('bun', '@ndop/cli@1.0.0', ['init'])).toEqual([
      'bunx',
      ['@ndop/cli@1.0.0', 'init'],
    ]);
    expect(runScriptCommand('bun', 'build')).toEqual(['bun', ['run', 'build']]);
  });

  it("runs the app's own ndop through npx, never fetching it", () => {
    expect(localCommand(['add', 'dialog'])).toEqual([
      'npx',
      ['ndop', 'add', 'dialog'],
    ]);
  });
});

describe('localCliProblems', () => {
  const version = '0.0.0-e2e.1';

  it('accepts @ndop/cli pinned to the version under test, and run locally', () => {
    expect(
      localCliProblems(
        { devDependencies: { '@ndop/cli': version } },
        version,
        `${version}\n`,
      ),
    ).toEqual([]);
    expect(
      localCliProblems(
        { devDependencies: { '@ndop/cli': `^${version}` } },
        version,
        version,
      ),
    ).toEqual([]);
  });

  it('reports a missing dev dependency and another version run', () => {
    expect(localCliProblems({}, version, '1.0.0\n')).toEqual([
      `package.json has @ndop/cli nowhere in devDependencies, not ${version}`,
      `npx ndop --version printed "1.0.0", not ${version}`,
    ]);
  });
});

describe('lastJsonObject', () => {
  it('skips progress printed before the JSON', () => {
    expect(lastJsonObject('Packages: +12\n{\n  "ok": true\n}\n')).toEqual({
      ok: true,
    });
  });

  it('fails without JSON', () => {
    expect(() => lastJsonObject('nothing')).toThrow('No JSON in the output');
  });
});

describe('hashTree', () => {
  it('hashes project files but not installed or built output', async () => {
    await mkdir(join(folder, 'src'));
    await mkdir(join(folder, 'node_modules'));
    await writeFile(join(folder, 'src/a.ts'), 'a');
    await writeFile(join(folder, 'node_modules/b.js'), 'b');
    const before = await hashTree(folder);
    expect([...before.keys()]).toEqual(['src/a.ts']);

    await writeFile(join(folder, 'src/a.ts'), 'changed');
    await writeFile(join(folder, 'src/c.ts'), 'c');
    expect(changedPaths(before, await hashTree(folder))).toEqual([
      'src/a.ts',
      'src/c.ts',
    ]);
  });
});

describe('run', () => {
  it('returns standard output and logs both streams', async () => {
    const log = join(folder, 'log.txt');
    const options = { cwd: folder, env: process.env, log };
    const script = "process.stdout.write('out'); process.stderr.write('err')";
    expect(await run([process.execPath, ['-e', script]], options)).toBe('out');
    await expect(
      run(
        [process.execPath, ['-e', "console.error('boom'); process.exit(3)"]],
        options,
      ),
    ).rejects.toThrow(/exited with 3:\nboom/);
  });
});

describe('agentFileProblems', () => {
  const section =
    '<!-- ndop:start -->\n\n## Ndop UI\n\nSearch `npx ndop list`; run `npx ndop add <names> --yes`.\n\n`dialog` 0.1.2.\n\n<!-- ndop:end -->\n';
  const claude =
    '<!-- ndop:start -->\n\n## Ndop UI\n\nUse the `search_components` and `list_blocks` MCP tools.\n\n`dialog` 0.1.2.\n\n<!-- ndop:end -->\n';
  const good = {
    'AGENTS.md': `${TEAM_NOTE}\n${section}`,
    'CLAUDE.md': claude,
    '.claude/skills/ndop/SKILL.md': '---\nname: ndop\n---\n',
    '.mcp.json': JSON.stringify({
      mcpServers: { ndop: { args: ['-y', '@ndop/mcp'] } },
    }),
  };

  it('accepts what init and add write', () => {
    expect(agentFileProblems(good, 'dialog')).toEqual([]);
  });

  it('reports a lost note, a missing item, a wrong CLAUDE.md and no server', () => {
    expect(
      agentFileProblems(
        {
          ...good,
          'AGENTS.md': section,
          'CLAUDE.md': section,
          '.mcp.json': undefined,
        },
        'popover',
      ),
    ).toEqual([
      "AGENTS.md doesn't keep the team's note above the Ndop section",
      "AGENTS.md doesn't list popover",
      "CLAUDE.md doesn't list the item and send Claude Code to the MCP tools",
      ".mcp.json doesn't register the ndop server",
    ]);
  });

  it('reports MCP tools in AGENTS.md, which any agent reads', () => {
    expect(
      agentFileProblems(
        { ...good, 'AGENTS.md': `${TEAM_NOTE}\n${claude}` },
        'dialog',
      ),
    ).toEqual([
      "AGENTS.md doesn't run the app's own ndop",
      "AGENTS.md doesn't search with ndop list",
    ]);
  });
});

describe('verifyProblems', () => {
  const ok = { ok: true, problems: [] };
  const caught = {
    ok: false,
    problems: BAD_PAGE_RULES.map((rule) => ({ rule, message: 'x' })),
  };

  it('accepts a passing good page and a caught bad one', () => {
    expect(verifyProblems(ok, caught)).toEqual([]);
  });

  it('reports a failed good page and missed problems', () => {
    expect(
      verifyProblems(
        { ok: false, problems: [{ rule: 'build/TS2322', message: 'Nope.' }] },
        {
          ok: false,
          problems: [{ rule: 'usage/unknown-selector', message: 'x' }],
        },
      ),
    ).toEqual([
      'ndop verify failed a correct page: build/TS2322: Nope.',
      'ndop verify missed ndop/icon-button-name, axe/button-name on the broken page',
    ]);
  });
});

describe('addDevCommand', () => {
  it('adds a dev dependency with each package manager', () => {
    expect(addDevCommand('npm', 'a@1')).toEqual([
      'npm',
      ['install', '--save-dev', 'a@1'],
    ]);
    expect(addDevCommand('bun', 'a@1')).toEqual(['bun', ['add', '-d', 'a@1']]);
  });
});

describe('installableItems', () => {
  it('lists components, examples and blocks, not libs or themes', () => {
    expect(
      installableItems({
        items: [
          { name: 'utils', type: 'registry:lib' },
          { name: 'default', type: 'registry:theme' },
          { name: 'button', type: 'registry:ui' },
          { name: 'button-demo', type: 'registry:primitive-usage' },
          { name: 'login-01', type: 'registry:block' },
        ],
      }),
    ).toEqual(['button', 'button-demo', 'login-01']);
  });
});

describe('listProblems', () => {
  const button = { name: 'button', type: 'registry:ui', version: '1.0.0' };

  it('passes when the item is listed as installed at its latest version', () => {
    expect(
      listProblems(
        { ok: true, items: [{ ...button, installed: '1.0.0' }] },
        'button',
      ),
    ).toEqual([]);
  });

  it('reports a failed run, a missing item and a wrong version', () => {
    expect(listProblems({ ok: false }, 'button')).toEqual([
      'ndop list listed no components: {"ok":false}',
    ]);
    expect(listProblems({ ok: true, items: [button] }, 'dialog')).toEqual([
      "ndop list didn't list dialog",
    ]);
    expect(listProblems({ ok: true, items: [button] }, 'button')).toEqual([
      'ndop list shows button installed at no version, not 1.0.0',
    ]);
  });
});
