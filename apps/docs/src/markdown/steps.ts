import type { MarkedExtension, Token, Tokens } from 'marked';

/**
 * A `:::steps` block. Its tokens stay in one flat `tokens` list, which
 * marked walks, so a highlighter reaches the code blocks inside; the
 * renderer groups them into steps.
 */
interface StepsToken extends Tokens.Generic {
  type: 'steps';
  raw: string;
  tokens: Token[];
}

/** Opens a block; it ends at the next line that is exactly `:::`. */
const STEPS = /^:::steps[ \t]*\n([\s\S]*?)\n:::[ \t]*(?:\n+|$)/;

/**
 * Numbered steps in Markdown, styled like the component pages' manual
 * installation (the `.steps` styles). Each `###` heading inside a
 * `:::steps` block starts a step; everything up to the next one, code
 * blocks included, belongs to it.
 *
 * ```md
 * :::steps
 * ### Set it up
 * ~~~bash pm
 * npx @ndop/cli init
 * ~~~
 * ### Add a component
 * Run `ndop add` with its name.
 * :::
 * ```
 *
 * Step titles stay out of the "On this page" rail: they have no `id`.
 *
 * @returns The marked extension, for Analog's `markedOptions.extensions`.
 */
export function stepsExtension(): MarkedExtension {
  return {
    extensions: [
      {
        name: 'steps',
        level: 'block',
        start: (source) => source.match(/^:::steps/m)?.index,
        tokenizer(source) {
          const match = STEPS.exec(source);
          if (!match) return undefined;
          const tokens = this.lexer
            .blockTokens(match[1] ?? '', [])
            .filter((token) => token.type !== 'space');
          const first = tokens[0];
          if (first && !(first.type === 'heading' && first.depth === 3)) {
            // Text before the first heading would have no step to go in.
            throw new Error(
              ':::steps must start with a "###" heading for its first step.',
            );
          }
          return { type: 'steps', raw: match[0], tokens } satisfies StepsToken;
        },
        renderer(token) {
          const steps: { title: Tokens.Heading; body: Token[] }[] = [];
          for (const child of (token as StepsToken).tokens) {
            if (child.type === 'heading' && child.depth === 3) {
              steps.push({ title: child as Tokens.Heading, body: [] });
            } else {
              steps.at(-1)?.body.push(child);
            }
          }
          const items = steps.map(
            (step) =>
              `<li><h3 class="step-title">${this.parser.parseInline(step.title.tokens)}</h3>${this.parser.parse(step.body)}</li>`,
          );
          return `<ol class="steps">${items.join('')}</ol>\n`;
        },
      },
    ],
  };
}
