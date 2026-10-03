import { applyCss, applyCssVars, ensureImports } from './stylesheet';

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
