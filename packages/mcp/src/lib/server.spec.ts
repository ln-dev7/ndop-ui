import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import {
  REGISTRY_FILES,
  REGISTRY_URL,
  registryFetcher,
} from '../testing/registry';
import { Catalog } from './catalog';
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

  it('lists the read-only tools, with output schemas', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'get_block',
      'get_component',
      'get_example',
      'list_blocks',
      'search_components',
    ]);
    for (const tool of tools) {
      expect(tool.outputSchema).toBeDefined();
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
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
    expect(result.text).toContain('npx ndop add settings-form');
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
