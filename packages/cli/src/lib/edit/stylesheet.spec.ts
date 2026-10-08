import {
  applyCss,
  applyCssVars,
  ensureImports,
  updateCssVars,
} from './stylesheet';

describe('ensureImports', () => {
  it('adds missing imports after the existing ones, once', () => {
    const css = "@import 'tailwindcss';\n\nbody { margin: 0; }\n";
    const once = ensureImports(css, ['tailwindcss', '@ndop/core/styles.css']);
    expect(once).toBe(
      "@import 'tailwindcss';\n@import '@ndop/core/styles.css';\n\nbody { margin: 0; }\n",
    );
    expect(ensureImports(once, ['@ndop/core/styles.css'])).toBe(once);
  });
});

describe('applyCssVars', () => {
  it('replaces existing values and keeps other declarations', () => {
    const css = ':root {\n  --brand: red;\n  --background: white;\n}\n';
    expect(applyCssVars(css, { light: { background: 'black' } })).toBe(
      ':root {\n  --brand: red;\n  --background: black;\n}\n',
    );
  });
});

describe('applyCss', () => {
  it('merges rules into existing ones', () => {
    const css = '@layer base {\n  body {\n    margin: 0;\n  }\n}\n';
    expect(applyCss(css, { '@layer base': { body: { padding: '0' } } })).toBe(
      '@layer base {\n  body {\n    margin: 0;\n    padding: 0;\n  }\n}\n',
    );
  });
});

describe('updateCssVars', () => {
  const css = `:root {
  --brand: red;
  --ring: gray;
  --mine: pink;
}

.dark {
  --brand: maroon;
}
`;

  it('updates unedited variables, adds new ones and keeps edited ones', () => {
    const result = updateCssVars(
      css.replace('--ring: gray', '--ring: silver'),
      {
        light: { brand: 'red', ring: 'gray', gone: 'x' },
        dark: { brand: 'maroon' },
      },
      {
        light: { brand: 'blue', ring: 'black', fresh: 'green' },
        dark: { brand: 'navy' },
      },
    );
    expect(result.kept).toEqual(['--ring in :root']);
    expect(result.css).toBe(`:root {
  --brand: blue;
  --ring: silver;
  --mine: pink;
  --fresh: green;
}

.dark {
  --brand: navy;
}
`);
  });

  it("doesn't bring back a variable the user removed", () => {
    const result = updateCssVars(
      css.replace('  --ring: gray;\n', ''),
      { light: { ring: 'gray' } },
      { light: { ring: 'black' } },
    );
    expect(result).toEqual({
      css: css.replace('  --ring: gray;\n', ''),
      kept: [],
    });
  });

  it('leaves the stylesheet untouched when nothing changed upstream', () => {
    const vars = { light: { brand: 'red' }, dark: { brand: 'maroon' } };
    expect(updateCssVars(css, vars, vars)).toEqual({ css, kept: [] });
  });
});
