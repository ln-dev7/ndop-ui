import ts from 'typescript';
import { usageOf } from './usage';

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
    expect(usageOf(ts, source).imports).toBe(
      "import { Button } from '@/ui/button/button';\nimport { Label } from '@/ui/label/label';",
    );
  });

  it('takes the template, flush left', () => {
    expect(usageOf(ts, source).template).toBe(
      '<label ndLabel>Name</label>\n<button ndButton>\n  Save\n</button>',
    );
  });
});
