import { defaultTarget, usageOf, withoutTsdocLinks } from './component-docs';

describe('usageOf', () => {
  const source = `import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { Label } from '@/ui/label/label';

@Component({
  selector: 'example-demo',
  imports: [Button, Label, NdIcon],
  template: \`
    <label ndLabel>Name</label>
    <button ndButton>
      Save
    </button>
  \`,
})
export class DemoExample {}
`;

  it('keeps only the registry imports', () => {
    expect(usageOf(source).imports).toBe(
      "import { Button } from '@/ui/button/button';\nimport { Label } from '@/ui/label/label';",
    );
  });

  it('takes the template, flush left', () => {
    expect(usageOf(source).template).toBe(
      '<label ndLabel>Name</label>\n<button ndButton>\n  Save\n</button>',
    );
  });
});

describe('defaultTarget', () => {
  it('fills in the default ndop.json aliases', () => {
    expect(defaultTarget('{ui}/dialog/dialog.ts')).toBe(
      'src/app/ui/dialog/dialog.ts',
    );
    expect(defaultTarget('{lib}/utils.ts')).toBe('src/app/lib/utils.ts');
  });
});

describe('withoutTsdocLinks', () => {
  it('turns links into code spans', () => {
    expect(withoutTsdocLinks('Closes its {@link NdDialog}.')).toBe(
      'Closes its `NdDialog`.',
    );
    expect(withoutTsdocLinks('See {@link NdDialog | the dialog}.')).toBe(
      'See `the dialog`.',
    );
  });
});
