import { Component, computed, Directive, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { cn } from './cn';
import { variants } from './variants';

// Pins the Angular behaviors ADR-0005 builds the styled layer on. If an
// Angular upgrade breaks either one, these tests fail before users' class
// overrides or composed primitives do.

let primitiveInstances = 0;

@Directive({ selector: 'button[ndProbe]' })
class ProbePrimitive {
  constructor() {
    primitiveInstances++;
  }
}

const probeVariants = variants({
  base: 'inline-flex bg-primary px-4',
});

@Directive({
  selector: 'button[ndProbe]',
  hostDirectives: [ProbePrimitive],
  host: { '[class]': 'classes()' },
})
class ProbeStyled {
  readonly class = input('');
  protected readonly classes = computed(() =>
    cn(probeVariants(), this.class()),
  );
}

@Component({
  imports: [ProbeStyled],
  template: `
    <button ndProbe class="bg-accent">Static</button>
    <button ndProbe [class]="bound">Bound</button>
  `,
})
class StyledHost {
  bound = 'px-2';
}

describe('styled layer contract (ADR-0005)', () => {
  beforeEach(() => {
    primitiveInstances = 0;
  });

  it('routes static and bound user classes through cn() so they win', async () => {
    const fixture = TestBed.createComponent(StyledHost);
    await fixture.whenStable();
    const [staticButton, boundButton] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];

    expect(staticButton?.className.split(' ').sort()).toEqual([
      'bg-accent',
      'inline-flex',
      'px-4',
    ]);
    expect(boundButton?.className.split(' ').sort()).toEqual([
      'bg-primary',
      'inline-flex',
      'px-2',
    ]);
  });

  // Importing the primitive next to the styled item is not part of the
  // contract: Angular 21 throws NG0309 for it while Angular 22 deduplicates,
  // so templates import the styled item only (ADR-0005 amendment 1).
  it('composes exactly one primitive per styled element', async () => {
    const fixture = TestBed.createComponent(StyledHost);
    await fixture.whenStable();
    expect(primitiveInstances).toBe(2);
  });
});
