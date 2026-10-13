import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { Catalog, type DoctorResult } from '@ndop/cli/api';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import {
  projectFixture,
  REGISTRY_FILES,
  REGISTRY_URL,
  registryFetcher,
} from '../testing/registry';
import { createNdopServer } from './server';

let client: Client;
let close: () => Promise<void>;

/**
 * Connects a client to a server over the fixture registry, the way
 * `ndop-mcp` serves stdio.
 *
 * @param files - The registry's files.
 */
async function connect(files: Record<string, unknown> = { ...REGISTRY_FILES }) {
  const catalog = new Catalog(
    { url: REGISTRY_URL },
    registryFetcher(files).fetcher,
  );
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const handle = serveStdio(
    () => createNdopServer({ catalog, version: '1.2.3' }),
    { transport: serverSide },
  );
  client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(clientSide);
  close = async () => {
    await client.close();
    await handle.close();
  };
}

/**
 * Calls a tool.
 *
 * @param name - Tool name.
 * @param args - Its arguments.
 * @returns The text, structured content and error flag.
 */
async function call(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const [first] = result.content as { type: string; text: string }[];
  return {
    text: first?.text ?? '',
    structured: result.structuredContent as Record<string, unknown>,
    isError: result.isError ?? false,
  };
}

afterEach(async () => {
  await close();
});

describe('the Ndop MCP server', () => {
  beforeEach(() => connect());

  it('lists every tool, with output schemas, and marks the writing ones', async () => {
    const { tools } = await client.listTools();
    expect(
      Object.fromEntries(
        tools.map((tool) => [
          tool.name,
          tool.annotations?.readOnlyHint ?? false,
        ]),
      ),
    ).toEqual({
      add_items: false,
      get_block: true,
      get_component: true,
      get_example: true,
      get_project_context: true,
      list_blocks: true,
      search_components: true,
      validate_usage: true,
      verify: false,
    });
    for (const tool of tools) expect(tool.outputSchema).toBeDefined();
  });

  it('tells clients how to use it', () => {
    expect(client.getInstructions()).toContain('Never guess an Ndop API');
  });

  it('searches components, and lists them all when nothing matches', async () => {
    const found = await call('search_components', { query: 'modal' });
    expect(found.structured).toEqual({
      matched: true,
      results: [expect.objectContaining({ name: 'dialog', score: 30 })],
    });
    expect(found.text).toContain('- dialog (Dialog): A window overlaid');

    const none = await call('search_components', { query: 'carousel' });
    expect(none.structured['matched']).toBe(false);
    expect(
      (none.structured['results'] as { name: string }[]).map((r) => r.name),
    ).toEqual(['dialog', 'separator']);
    expect(none.text).toContain('No component matched "carousel"');
  });

  it("returns a component's Markdown and metadata", async () => {
    const result = await call('get_component', { name: 'dialog' });
    expect(result.text).toMatch(/^# Dialog\n/);
    expect(result.structured).toEqual(
      expect.objectContaining({ name: 'dialog', version: '0.2.0' }),
    );
    expect(result.structured['metadata']).toEqual(
      expect.objectContaining({ keywords: ['modal', 'popup'] }),
    );
  });

  it('reports an unknown component as a tool error with suggestions', async () => {
    const result = await call('get_component', { name: 'dialgo' });
    expect(result.isError).toBe(true);
    expect(result.text).toBe(
      'The registry has no component named "dialgo". Closest: dialog, separator.',
    );
  });

  it('returns an example with what it demonstrates', async () => {
    const result = await call('get_example', { name: 'dialog-demo' });
    expect(result.structured).toEqual({
      name: 'dialog-demo',
      title: 'Edit profile dialog',
      description: 'A dialog with a form.',
      demonstrates: ['dialog'],
      registryDependencies: ['dialog'],
      files: [
        {
          target: '{ui}/examples/dialog-demo.ts',
          content: 'export class DialogDemo {}',
        },
      ],
    });
  });

  it('lists blocks, by category', async () => {
    const all = await call('list_blocks', {});
    expect(all.structured).toEqual({
      blocks: [
        {
          name: 'settings-form',
          title: 'Settings form',
          description: 'A profile settings form.',
          categories: ['forms'],
        },
      ],
    });
    const none = await call('list_blocks', { category: 'charts' });
    expect(none.structured).toEqual({ blocks: [] });
    expect(none.text).toContain('no blocks in "charts"');
  });

  it("returns a block's files and its whole dependency tree", async () => {
    const result = await call('get_block', { name: 'settings-form' });
    expect(result.structured).toEqual(
      expect.objectContaining({
        registryDependencies: ['dialog', 'separator', 'utils'],
        dependencies: ['@ndop/primitives', '@ndop/core'],
      }),
    );
    expect(result.text).toContain('npx @ndop/cli add settings-form');
  });

  it('serves component docs and tokens as resources', async () => {
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate)).toEqual([
      'ndop://components/{name}',
    ]);
    const { resources } = await client.listResources();
    expect(resources.map((resource) => resource.uri)).toEqual([
      'ndop://tokens',
      'ndop://components/dialog',
      'ndop://components/separator',
    ]);

    const dialog = await client.readResource({
      uri: 'ndop://components/dialog',
    });
    expect(dialog.contents[0]).toEqual(
      expect.objectContaining({ mimeType: 'text/markdown' }),
    );

    const tokens = await client.readResource({ uri: 'ndop://tokens' });
    const text = (tokens.contents[0] as { text: string }).text;
    expect(text).toContain('# Default theme tokens');
    expect(text).toContain(
      '| `--primary-foreground` | Text and icons on primary: Main actions and emphasis. |  | `white` | `black` |',
    );
  });

  it('offers the build-screen prompt', async () => {
    const prompt = await client.getPrompt({
      name: 'build-screen',
      arguments: { description: 'A settings page.' },
    });
    const [message] = prompt.messages;
    expect(message?.role).toBe('user');
    expect((message?.content as { text: string }).text).toMatch(
      /^Build this screen in the Angular app, with Ndop UI: A settings page\./,
    );
  });
});

describe('without blocks', () => {
  beforeEach(() => {
    const files = { ...REGISTRY_FILES } as Record<string, unknown>;
    const index = files['index'] as { items: { type: string }[] };
    files['index'] = {
      ...index,
      items: index.items.filter((item) => item.type !== 'registry:block'),
    };
    return connect(files);
  });

  it('says to compose from components', async () => {
    const result = await call('list_blocks', {});
    expect(result.text).toBe(
      'The registry has no blocks. Compose the screen from components (search_components).',
    );
  });
});

describe('the project tools', { timeout: 30_000 }, () => {
  let project: { root: string; remove: () => Promise<void> };

  beforeEach(async () => {
    project = await projectFixture({
      'src/app/page.ts': `import { Component } from '@angular/core';

@Component({
  selector: 'app-page',
  template: \`<h2 ndDialogContent>Lost</h2><div ndCard></div>\`,
})
export class Page {}
`,
    });
    await connect();
  });

  afterEach(() => project.remove());

  it('describes the project, with edited files and tokens', async () => {
    const context = await call('get_project_context', { cwd: project.root });
    expect(context.structured).toEqual(
      expect.objectContaining({
        items: [
          {
            name: 'dialog',
            registry: '@ndop',
            version: '0.2.0',
            files: [{ path: 'src/app/ui/dialog/dialog.ts', state: 'edited' }],
          },
        ],
        tokens: { colors: ['primary'], other: ['radius'] },
      }),
    );
    expect(context.text).toContain(
      'Edited since installed: src/app/ui/dialog/dialog.ts (edited).',
    );
  });

  it('includes what ndop doctor finds, checked offline', async () => {
    const context = await call('get_project_context', { cwd: project.root });
    const doctor = context.structured['doctor'] as DoctorResult;
    expect(doctor.offline).toBe(true);
    expect(doctor.ok).toBe(false);
    expect(doctor.checks.find((check) => check.id === 'lockfile')).toEqual(
      expect.objectContaining({
        status: 'warning',
        details: [
          'src/app/ui/dialog/dialog.ts was edited since it was installed.',
        ],
      }),
    );
    expect(context.text).toContain(
      'ndop doctor found problems with the setup; fix them before writing UI (npx @ndop/cli doctor --fix applies the safe fixes):',
    );
    expect(context.text).toContain(
      "- Angular (error): package.json doesn't depend on @angular/core.",
    );
  });

  it('points out conflicts an update left', async () => {
    const path = join(project.root, 'src/app/ui/dialog/dialog.ts');
    const original = await readFile(path, 'utf-8');
    await writeFile(
      path,
      `<<<<<<< local\na\n=======\nb\n>>>>>>> ndop@0.3.0\n${original}`,
    );
    try {
      const context = await call('get_project_context', { cwd: project.root });
      expect(context.text).toContain(
        'ndop update left conflict markers in src/app/ui/dialog/dialog.ts: resolve them, then run npx @ndop/cli update --continue.',
      );
    } finally {
      await writeFile(path, original);
    }
  });

  it("validates a file's usage against the installed metadata", async () => {
    const result = await call('validate_usage', {
      file: 'src/app/page.ts',
      cwd: project.root,
    });
    expect(result.structured['ok']).toBe(false);
    expect(
      (result.structured['problems'] as { rule: string }[]).map(
        (problem) => problem.rule,
      ),
    ).toEqual(['usage/wrong-nesting', 'usage/unknown-selector']);
    expect(result.text).toContain('DialogContent must be inside [ndDialog].');
  });

  it('refuses paths outside the project', async () => {
    const result = await call('verify', {
      paths: ['../../etc'],
      cwd: project.root,
    });
    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/is outside the project/);
  });

  it('plans an install with diffs on a dry run', async () => {
    const result = await call('add_items', {
      names: ['separator'],
      cwd: project.root,
      dryRun: true,
    });
    expect(result.isError).toBe(false);
    expect(result.structured['applied']).toBe(false);
    expect(result.text).toContain('Dry run; nothing was written.');
    expect(result.text).toContain('+++ b/src/app/ui/separator/separator.ts');
  });
});
