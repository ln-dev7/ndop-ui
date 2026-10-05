import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { validate, type SchemaName } from './validate';

const fixtures = join(import.meta.dirname, '../../fixtures');

/**
 * Fixture files are named `<schema>.<case>.json`.
 */
function load(folder: 'valid' | 'invalid') {
  return readdirSync(join(fixtures, folder)).map((file) => ({
    file,
    schema: file.split('.')[0] as SchemaName,
    data: JSON.parse(readFileSync(join(fixtures, folder, file), 'utf-8')),
  }));
}

/**
 * Where each invalid fixture must fail, so a fixture can't pass the suite by
 * failing for an unrelated reason.
 */
const expectedIssuePaths: Record<string, string> = {
  'registry-item.docs-object.json': '/docs',
  'registry-item.missing-version.json': '',
  'registry-item.untokened-target.json': '/files/0/target',
  'registry-item.react-type.json': '/type',
  'registry-item.ui-without-angular.json': '',
  'registry-item.empty-files.json': '/files',
  'config.missing-aliases.json': '',
  'config.registry-without-name-token.json': '/registries/@acme/url',
  'config.registry-without-name.json': '/registry',
  'lock.bad-hash.json': '/items/@ndop~1dialog/files/0/sha256',
  'lock.bad-agent-file-hash.json': '/agentFiles/AGENTS.md',
  'config.unknown-agent.json': '/agents',
  'metadata.undocumented-input.json': '/parts/0/inputs/0/description',
  'metadata.no-keyboard.json': '',
  'metadata.empty-keywords.json': '/keywords',
};

describe('validate', () => {
  it.each(load('valid'))('accepts $file', ({ schema, data }) => {
    expect(validate(schema, data)).toEqual({ valid: true, value: data });
  });

  it.each(load('invalid'))(
    'rejects $file at the expected path',
    ({ file, schema, data }) => {
      const result = validate(schema, data);
      expect(result.valid).toBe(false);
      const paths = result.valid
        ? []
        : result.issues.map((issue) => issue.path);
      expect(paths).toContain(expectedIssuePaths[file]);
    },
  );

  it('covers every invalid fixture with an expected path', () => {
    expect(
      load('invalid')
        .map(({ file }) => file)
        .sort(),
    ).toEqual(Object.keys(expectedIssuePaths).sort());
  });

  it('accepts the repository source manifest', () => {
    const manifest = JSON.parse(
      readFileSync(
        join(import.meta.dirname, '../../../../registry/registry.json'),
        'utf-8',
      ),
    );
    expect(validate('registry', manifest).valid).toBe(true);
  });
});
