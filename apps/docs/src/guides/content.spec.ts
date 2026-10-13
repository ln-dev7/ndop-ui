import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitGuide } from '../app/site/guides';

// The guides' code, and the directives, items and pages they name, are
// checked against the registry by the docs' `guides` target (ADR-0030).

const workspace = join(import.meta.dirname, '../../../..');

describe('the roadmap', () => {
  const markdown = readFileSync(
    join(import.meta.dirname, 'getting-started/roadmap.md'),
    'utf-8',
  );
  const guide = splitGuide(markdown);
  const body = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, '');

  it('is the same in ROADMAP.md and on the site', () => {
    expect(readFileSync(join(workspace, 'ROADMAP.md'), 'utf-8')).toBe(
      `# ${guide.attributes.title}\n\n${body}`,
    );
  });

  it('links only to absolute URLs, which work on GitHub as on the site', () => {
    expect(body).not.toMatch(/\]\((?!https:\/\/)/);
  });
});
