import { Marked } from 'marked';
import { stepsExtension } from './steps';

describe('stepsExtension', () => {
  const marked = new Marked(stepsExtension());

  it('turns each heading of a block into a step', () => {
    const html = marked.parse(
      [
        'Before.',
        '',
        ':::steps',
        '### Install `ndop`',
        '',
        'Run it.',
        '',
        '```bash',
        'npx ndop init',
        '```',
        '',
        '### Done',
        ':::',
        '',
        'After.',
      ].join('\n'),
    ) as string;
    expect(html).toBe(
      '<p>Before.</p>\n' +
        '<ol class="steps">' +
        '<li><h3 class="step-title">Install <code>ndop</code></h3><p>Run it.</p>\n' +
        '<pre><code class="language-bash">npx ndop init\n</code></pre>\n</li>' +
        '<li><h3 class="step-title">Done</h3></li>' +
        '</ol>\n' +
        '<p>After.</p>\n',
    );
  });

  it('lets other extensions reach the code inside, as Shiki does', () => {
    const languages: string[] = [];
    new Marked(stepsExtension(), {
      walkTokens: (token) => {
        if (token.type === 'code') languages.push(token.lang ?? '');
      },
    }).parse(':::steps\n### One\n```ts\nconst a = 1;\n```\n:::');
    expect(languages).toEqual(['ts']);
  });

  it('refuses content before the first step', () => {
    expect(() => marked.parse(':::steps\nLoose text.\n:::')).toThrow(
      /must start with a "###" heading/,
    );
  });
});
