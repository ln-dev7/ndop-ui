import { newTypeErrors } from './typecheck';

describe('newTypeErrors', () => {
  const local = `import { cn } from '@/lib/utils';
export const sizes = {
  sm: 'h-8',
  lg: 'h-10',
};
`;

  it('ignores errors the file already had, such as unresolved imports', () => {
    const merged = local.replace("lg: 'h-10',", "lg: 'h-10',\n  xl: 'h-12',");
    expect(newTypeErrors('src/app/ui/x.ts', local, merged)).toEqual([]);
  });

  it('reports a duplicate key a union of insertions created', () => {
    const merged = local.replace(
      "lg: 'h-10',",
      "lg: 'h-10',\n  xs: 'h-6',\n  xs: 'h-7',",
    );
    expect(newTypeErrors('src/app/ui/x.ts', local, merged)).toEqual([
      expect.stringMatching(/^TS1117: /),
    ]);
  });

  it('reports a duplicate class member', () => {
    const before = 'export class A {\n  a = 1;\n}\n';
    const after = 'export class A {\n  a = 1;\n  b = 1;\n  b = 2;\n}\n';
    expect(newTypeErrors('a.ts', before, after)).toEqual([
      expect.stringMatching(/Duplicate identifier 'b'/),
    ]);
  });
});
