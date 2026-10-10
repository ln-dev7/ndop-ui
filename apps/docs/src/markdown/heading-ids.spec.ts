import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { headingId, headingIdsExtension } from './heading-ids';
import { stepsExtension } from './steps';

const ids = (html: string) =>
  [...html.matchAll(/<h[1-6] id="([^"]*)"/g)].map((match) => match[1]);

describe('headingId', () => {
  it('slugs headings the way the page does', () => {
    const seen = new Map<string, number>();
    expect(headingId("What it's built on", seen)).toBe('what-its-built-on');
    expect(headingId('What `init` changes', seen)).toBe('what-init-changes');
    expect(headingId('What `init` changes', seen)).toBe('what-init-changes-1');
  });
});

describe('headingIdsExtension', () => {
  it('gives headings the ids headingId gives them', () => {
    const markdown = [
      '## Options',
      '### What `init` changes',
      '## Options',
      "#### What it's built on",
    ].join('\n\n');
    const seen = new Map<string, number>();
    expect(
      ids(new Marked(headingIdsExtension()).parse(markdown) as string),
    ).toEqual([
      headingId('Options', seen),
      headingId('What `init` changes', seen),
      headingId('Options', seen),
      headingId("What it's built on", seen),
    ]);
  });

  it('renders the heading and leaves step titles without an id', () => {
    const html = new Marked(stepsExtension(), headingIdsExtension()).parse(
      ['## Install `ndop`', '', ':::steps', '### Run it', ':::'].join('\n'),
    ) as string;
    expect(html).toBe(
      '<h2 id="install-ndop">Install <code>ndop</code></h2>\n' +
        '<ol class="steps"><li><h3 class="step-title">Run it</h3></li></ol>\n',
    );
  });

  it('numbers repeats per document when parses overlap', async () => {
    // As Analog sets it up: one instance for every guide, with
    // marked-gfm-heading-id first and an async highlighter that lets
    // parses interleave.
    const marked = new Marked(gfmHeadingId(), headingIdsExtension(), {
      async: true,
      walkTokens: async (token) => {
        if (token.type === 'code') {
          await new Promise((resolve) => setTimeout(resolve));
        }
      },
    });
    const page = ['## Options', '```ts\nx\n```', '## Options'].join('\n\n');
    const pages = await Promise.all(
      Array.from({ length: 4 }, () => marked.parse(page)),
    );
    for (const html of pages) {
      expect(ids(html)).toEqual(['options', 'options-1']);
    }
  });
});
