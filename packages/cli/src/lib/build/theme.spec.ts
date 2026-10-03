import { themeFromCss } from './theme';

describe('themeFromCss', () => {
  it('rejects rules a theme item cannot carry', () => {
    expect(themeFromCss('body { color: red; }')).toEqual({
      problems: ['Unsupported CSS at line 1.'],
    });
  });

  it('rejects declarations that are not custom properties', () => {
    expect(themeFromCss(':root { color: red; }')).toEqual({
      problems: ['Only custom properties are allowed in themes (line 1).'],
    });
  });

  it('rejects relative imports', () => {
    expect(themeFromCss("@import './fonts.css';")).toEqual({
      problems: ["@import './fonts.css': themes can only import packages."],
    });
  });

  it('requires the system dark block to repeat .dark', () => {
    const css = `.dark { --a: black; }
      @media (prefers-color-scheme: dark) {
        [data-ndop-theme="system"] { --a: gray; }
      }`;
    expect(themeFromCss(css)).toEqual({
      problems: [
        "The [data-ndop-theme='system'] block must repeat the .dark values exactly.",
      ],
    });
  });
});
