import { insertJsonc } from './json';

const SERVER = { command: 'npx', args: ['-y'] };

describe('insertJsonc', () => {
  it("adds a value without reformatting the user's entries", () => {
    const text =
      '{\n  // Mine.\n  "mcpServers": {\n    "other": { "command": "x" }\n  }\n}\n';
    expect(insertJsonc(text, ['mcpServers', 'ndop'], SERVER)).toBe(
      '{\n  // Mine.\n  "mcpServers": {\n    "other": { "command": "x" },\n    "ndop": {\n      "command": "npx",\n      "args": [\n        "-y"\n      ]\n    }\n  }\n}\n',
    );
  });

  it('gives an insertion into an empty object its own lines', () => {
    expect(insertJsonc('{}\n', ['servers', 'ndop'], { command: 'npx' })).toBe(
      '{\n  "servers": {\n    "ndop": {\n      "command": "npx"\n    }\n  }\n}\n',
    );
  });
});
