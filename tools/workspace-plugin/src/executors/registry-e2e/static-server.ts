import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join, normalize, sep } from 'node:path';

/**
 * A running static file server.
 */
export interface StaticServer {
  /** Base URL, such as `http://localhost:51234`. */
  url: string;
  /** Stops the server. */
  close(): Promise<void>;
}

/**
 * Serves a folder over HTTP on a free local port, as ndop.dev serves the
 * built registry (ADR-0015). Only files inside the folder are served.
 *
 * @param folder - Absolute folder to serve.
 * @returns The running server.
 */
export async function serveFolder(folder: string): Promise<StaticServer> {
  const root = normalize(folder);
  const server: Server = createServer(async (request, response) => {
    const path = normalize(
      join(
        root,
        decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname),
      ),
    );
    if (!path.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(path);
      response
        .writeHead(200, {
          'content-type': path.endsWith('.json')
            ? 'application/json'
            : 'application/octet-stream',
        })
        .end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://localhost:${port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
