import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { serveHttp } from './lib/http';
import { catalogFor } from './lib/project';
import { createNdopServer } from './lib/server';

const USAGE = `Usage: ndop-mcp [options]

Serves the Ndop registry to coding agents over MCP: stdio by default, or
Streamable HTTP at /mcp with --http.

Options:
  --registry <url>  Registry URL or path with {name}; overrides NDOP_REGISTRY
                    and ndop.json
  --cwd <dir>       Project folder, for its ndop.json (default: .)
  --http            Serve over HTTP instead of stdio
  --port <port>     HTTP port (default: 3333)
  --host <host>     HTTP interface (default: 127.0.0.1)
  -v, --version     Print the version
  -h, --help        Print this help`;

// The published entry sits next to its package.json; reading the version at
// run time keeps it in sync with what was released.
const { version } = createRequire(import.meta.url)('./package.json') as {
  version: string;
};

const { values } = parseArgs({
  options: {
    registry: { type: 'string' },
    cwd: { type: 'string', default: '.' },
    http: { type: 'boolean', default: false },
    port: { type: 'string', default: '3333' },
    host: { type: 'string', default: '127.0.0.1' },
    version: { type: 'boolean', short: 'v', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

if (values.help) {
  process.stdout.write(`${USAGE}\n`);
} else if (values.version) {
  process.stdout.write(`${version}\n`);
} else {
  const catalog = await catalogFor({
    cwd: values.cwd,
    ...(values.registry ? { registry: values.registry } : {}),
  });
  const factory = () => createNdopServer({ catalog, version });
  if (values.http) {
    const endpoint = await serveHttp({
      factory,
      port: Number(values.port),
      host: values.host,
    });
    // stdout is reserved for the stdio protocol, so messages always go to
    // stderr.
    process.stderr.write(`Ndop MCP server listening at ${endpoint.url}\n`);
    if (!endpoint.loopback) {
      process.stderr.write(
        `Warning: ${values.host} isn't loopback, so other machines can reach this server.\n`,
      );
    }
  } else {
    serveStdio(factory, {
      onerror: (error) => process.stderr.write(`${error.message}\n`),
    });
  }
}
