import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';
import {
  createMcpHandler,
  type McpServerFactory,
} from '@modelcontextprotocol/server';

/** Options of {@link serveHttp}. */
export interface HttpOptions {
  /** Creates the MCP server for each request. */
  factory: McpServerFactory;
  /** Port; a free one when 0. */
  port: number;
  /** Interface to bind; loopback unless the user chooses otherwise. */
  host: string;
}

/** A running HTTP endpoint. */
export interface HttpEndpoint {
  /** The MCP endpoint's URL, such as `http://127.0.0.1:3333/mcp`. */
  url: string;
  /** Whether `Host` and `Origin` are checked against localhost. */
  loopback: boolean;
  /** Stops the server. */
  close(): Promise<void>;
}

/** Hosts that only this machine can reach. */
const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);

/**
 * Serves MCP over Streamable HTTP at `/mcp` (ADR-0009), through the SDK's
 * `createMcpHandler`, which also answers 2025-era clients statelessly. On a
 * loopback host, requests whose `Host` or `Origin` isn't localhost are
 * refused, so a web page can't reach the server through DNS rebinding.
 *
 * @param options - The server factory, port and host.
 * @returns The running endpoint.
 */
export async function serveHttp(options: HttpOptions): Promise<HttpEndpoint> {
  const loopback = LOOPBACK.has(options.host);
  const validateHost = localhostHostValidation();
  const validateOrigin = localhostOriginValidation();
  const handler = createMcpHandler(options.factory);
  const handle = toNodeHandler(handler);
  const server: Server = createServer((request, response) => {
    if (
      loopback &&
      (!validateHost(request, response) || !validateOrigin(request, response))
    ) {
      return;
    }
    if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/mcp') {
      response
        .writeHead(404, { 'content-type': 'text/plain' })
        .end('Not found');
      return;
    }
    void handle(request, response);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, options.host, resolve);
  });
  const { port } = server.address() as AddressInfo;
  const host = options.host.includes(':') ? `[${options.host}]` : options.host;
  return {
    url: `http://${host}:${port}/mcp`,
    loopback,
    close: async () => {
      await handler.close();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
