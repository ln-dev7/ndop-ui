import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';
import { REGISTRY_URL, registryFetcher } from '../testing/registry';
import { Catalog } from './catalog';
import { serveHttp, type HttpEndpoint } from './http';
import { createNdopServer } from './server';

let endpoint: HttpEndpoint;

beforeEach(async () => {
  const catalog = new Catalog({ url: REGISTRY_URL }, registryFetcher().fetcher);
  endpoint = await serveHttp({
    factory: () => createNdopServer({ catalog, version: '1.2.3' }),
    port: 0,
    host: '127.0.0.1',
  });
});

afterEach(() => endpoint.close());

describe('serveHttp', () => {
  it('serves MCP at /mcp on loopback', async () => {
    expect(endpoint.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
    expect(endpoint.loopback).toBe(true);
    const client = new Client({ name: 'test', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(endpoint.url)),
    );
    const result = await client.callTool({
      name: 'search_components',
      arguments: { query: 'separator' },
    });
    expect(result.structuredContent).toEqual(
      expect.objectContaining({ matched: true }),
    );
    await client.close();
  });

  it('refuses requests from other origins', async () => {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        origin: 'https://attacker.example',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(response.status).toBe(403);
  });

  it('answers 404 outside /mcp', async () => {
    const response = await fetch(endpoint.url.replace('/mcp', '/other'));
    expect(response.status).toBe(404);
  });
});
