import { fixture, runNdop, testEnvironment } from '../../testing/environment';
import { parseAgents, tokenNames } from '../install/agents';

type Environment = ReturnType<typeof testEnvironment>;

/**
 * Runs an ndop command with `--yes --json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Command and arguments.
 * @returns The JSON result.
 */
async function ndop(environment: Environment, ...args: string[]) {
  const { out } = await runNdop(environment, ...args, '--yes', '--json');
  return JSON.parse(out);
}

/**
 * A fresh Angular 22 app, with extra files.
 *
 * @param extra - Files to add.
 * @returns The environment.
 */
function app(extra: Record<string, string> = {}): Environment {
  return testEnvironment({ ...fixture('ng22'), ...extra });
}

const ALL = ['--agent', 'claude-code,cursor', '--agent', 'copilot', '--mcp'];

describe('agent context files', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('writes every agent file and registers the MCP server', async () => {
    const environment = app();
    const result = await ndop(environment, 'init', ...ALL);
    const files = environment.project.files;

    expect(
      result.files
        .map((file: { path: string }) => file.path)
        .filter(
          (path: string) => !/^(src|ndop|tsconfig|\.gitignore)/.test(path),
        ),
    ).toEqual([
      'AGENTS.md',
      'CLAUDE.md',
      '.claude/skills/ndop/SKILL.md',
      '.cursor/rules/ndop.mdc',
      '.github/copilot-instructions.md',
      '.mcp.json',
      '.cursor/mcp.json',
      '.vscode/mcp.json',
    ]);
    expect(JSON.parse(files.get('ndop.json') ?? '')).toEqual(
      expect.objectContaining({
        agents: ['claude-code', 'cursor', 'copilot'],
        mcp: true,
      }),
    );

    const server = { type: 'stdio', command: 'npx', args: ['-y', '@ndop/mcp'] };
    expect(JSON.parse(files.get('.mcp.json') ?? '')).toEqual({
      mcpServers: { ndop: server },
    });
    expect(JSON.parse(files.get('.cursor/mcp.json') ?? '')).toEqual({
      mcpServers: { ndop: server },
    });
    expect(JSON.parse(files.get('.vscode/mcp.json') ?? '')).toEqual({
      servers: { ndop: server },
    });

    const section = files.get('AGENTS.md') ?? '';
    expect(section).toMatchSnapshot();
    expect(files.get('CLAUDE.md')).toBe(section);
    expect(files.get('.github/copilot-instructions.md')).toBe(section);
    expect(files.get('.claude/skills/ndop/SKILL.md')).toMatch(
      /^---\nname: ndop\ndescription: Builds and changes this Angular app's UI/,
    );
    expect(files.get('.cursor/rules/ndop.mdc')).toMatch(
      /^---\ndescription: .+\nalwaysApply: true\n---\n\n# Ndop UI\n/,
    );

    const lock = JSON.parse(files.get('ndop.lock.json') ?? '');
    expect(Object.keys(lock.agentFiles)).toEqual([
      '.claude/skills/ndop/SKILL.md',
      '.cursor/rules/ndop.mdc',
    ]);
  });

  it('changes nothing when init and add run again', async () => {
    const environment = app();
    await ndop(environment, 'init', ...ALL);
    await ndop(environment, 'add', 'dialog');
    const before = new Map(environment.project.files);

    expect((await ndop(environment, 'init')).files).toEqual([]);
    expect((await ndop(environment, 'add', 'dialog')).files).toEqual([]);
    expect(environment.project.files).toEqual(before);
  });

  it('lists installed items and tells the agent how to read their docs', async () => {
    const environment = app();
    await ndop(environment, 'init');
    const before = environment.project.files.get('AGENTS.md') ?? '';
    const version = (name: string) => environment.registry[name]?.version;
    expect(before).toContain(
      `\`default\` ${version('default')}, \`icons\` ${version('icons')}, \`utils\` ${version('utils')}.`,
    );
    expect(before).toContain(
      'read `https://ndop.dev/docs/components/<name>.md`',
    );
    expect(before).toContain('run `npx ndop init --mcp`');

    await ndop(environment, 'add', 'dialog');
    expect(environment.project.files.get('AGENTS.md')).toContain(
      `\`default\` ${version('default')}, \`dialog\` ${version('dialog')}, \`icons\` ${version('icons')}, \`utils\` ${version('utils')}.`,
    );
  });

  it("runs the project's own ndop only once @ndop/cli is a dependency", async () => {
    const environment = app();
    await ndop(environment, 'init', '--no-cli');
    const agents = () => environment.project.files.get('AGENTS.md') ?? '';
    expect(agents()).toContain('run `npx @ndop/cli add <name>`');
    expect(agents()).not.toContain('npx ndop');

    const manifest = JSON.parse(
      environment.project.files.get('package.json') ?? '',
    );
    manifest.devDependencies['@ndop/cli'] = '^1.0.0';
    environment.project.files.set(
      'package.json',
      JSON.stringify(manifest, null, 2),
    );
    await ndop(environment, 'add', 'dialog');
    expect(agents()).toContain('run `npx ndop add <name>`');
    expect(agents()).not.toContain('npx @ndop/cli');
  });

  it('uses the agents a project already has, without asking', async () => {
    const environment = app({
      'CLAUDE.md': '# My rules\n',
      '.cursor/rules/style.mdc': '---\nalwaysApply: true\n---\nTabs.\n',
    });
    await ndop(environment, 'init');
    const config = JSON.parse(environment.project.files.get('ndop.json') ?? '');
    expect(config.agents).toEqual(['claude-code', 'cursor']);
    expect(config.mcp).toBe(false);
    expect(environment.project.files.has('.mcp.json')).toBe(false);
  });

  it('keeps the text outside the markers', async () => {
    const environment = app({ 'CLAUDE.md': '# My rules\n\nUse tabs.\n' });
    await ndop(environment, 'init', '--agent', 'claude-code');
    const written = environment.project.files.get('CLAUDE.md') ?? '';
    expect(written).toMatch(
      /^# My rules\n\nUse tabs\.\n\n<!-- ndop:start -->\n\n## Ndop UI\n/,
    );

    environment.project.files.set(
      'CLAUDE.md',
      `${written.replace('Use tabs.', 'Use spaces.')}\n## Later\n\nMine.\n`,
    );
    await ndop(environment, 'add', 'dialog');
    const updated = environment.project.files.get('CLAUDE.md') ?? '';
    expect(updated).toMatch(
      /^# My rules\n\nUse spaces\.\n\n<!-- ndop:start -->/,
    );
    expect(updated).toContain('`dialog`');
    expect(updated.endsWith('<!-- ndop:end -->\n\n## Later\n\nMine.\n')).toBe(
      true,
    );
  });

  it('leaves a file with unbalanced markers alone, with a warning', async () => {
    const broken = '# Mine\n\n<!-- ndop:start -->\n\nhalf\n';
    const environment = app({ 'AGENTS.md': broken });
    const result = await ndop(environment, 'init');
    expect(environment.project.files.get('AGENTS.md')).toBe(broken);
    expect(result.warnings).toContain(
      "AGENTS.md has unbalanced <!-- ndop:start --> and <!-- ndop:end --> markers, so its Ndop section wasn't updated. Leave one pair, or none.",
    );
  });

  it('skips a file Ndop owns once the user edits it', async () => {
    const environment = app();
    await ndop(environment, 'init', '--agent', 'claude-code');
    environment.project.files.set('.claude/skills/ndop/SKILL.md', 'Mine.\n');

    const result = await ndop(environment, 'add', 'dialog');
    expect(result.skipped).toEqual([
      {
        path: '.claude/skills/ndop/SKILL.md',
        reason:
          'It has local changes. Delete it to get the generated one back.',
      },
    ]);
    expect(environment.project.files.get('.claude/skills/ndop/SKILL.md')).toBe(
      'Mine.\n',
    );
  });

  it("keeps the MCP file's other servers, comments and own ndop entry", async () => {
    const mine =
      '{\n  // Mine.\n  "mcpServers": {\n    "other": { "command": "x" }\n  }\n}\n';
    const environment = app({ '.mcp.json': mine });
    await ndop(environment, 'init', '--agent', 'claude-code', '--mcp');
    const written = environment.project.files.get('.mcp.json') ?? '';
    expect(written).toContain('// Mine.');
    expect(written).toContain('"other": { "command": "x" }');
    expect(written).toContain('"ndop": {');

    const custom = written.replace('"-y"', '"--yes"');
    environment.project.files.set('.mcp.json', custom);
    await ndop(environment, 'add', 'dialog');
    expect(environment.project.files.get('.mcp.json')).toBe(custom);
  });

  it('writes nothing for --agent none', async () => {
    const environment = app();
    await ndop(environment, 'init', '--agent', 'none');
    expect(environment.project.files.has('AGENTS.md')).toBe(false);
    expect(
      JSON.parse(environment.project.files.get('ndop.json') ?? '').agents,
    ).toBe(false);
    await ndop(environment, 'add', 'dialog');
    expect(environment.project.files.has('AGENTS.md')).toBe(false);
  });

  it('warns when --mcp has no agent to register for', async () => {
    const result = await ndop(app(), 'init', '--mcp');
    expect(result.warnings).toContain(
      'No agent to register the MCP server for; pass --agent claude-code, cursor or copilot.',
    );
  });

  it('rejects unknown agents', async () => {
    const result = await ndop(app(), 'init', '--agent', 'emacs');
    expect(result.errors).toEqual([
      {
        message:
          'Unknown agent "emacs". Use claude-code, cursor, copilot or none.',
      },
    ]);
  });
});

describe('parseAgents', () => {
  it('accepts repeated and comma-separated names, once each', () => {
    expect(parseAgents(['cursor, copilot', 'cursor'])).toEqual([
      'cursor',
      'copilot',
    ]);
  });

  it('rejects none with other agents', () => {
    expect(() => parseAgents(['none', 'cursor'])).toThrow(
      "--agent none can't be combined with other agents.",
    );
  });
});

describe('tokenNames', () => {
  it('splits :root tokens into colors and others', () => {
    expect(
      tokenNames(
        ':root {\n  --radius: 0.625rem;\n  --primary: oklch(0.2 0 0);\n  --ring: #000;\n}\n.dark { --muted: oklch(0 0 0); }',
      ),
    ).toEqual({ colors: ['primary', 'ring'], other: ['radius'] });
  });
});
