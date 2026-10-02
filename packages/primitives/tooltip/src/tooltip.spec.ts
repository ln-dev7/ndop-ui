import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NdTooltip } from './tooltip';

@Component({
  imports: [NdTooltip],
  template: `<div ndTooltip></div>`,
})
class TestHost {}

describe('NdTooltip', () => {
  it('attaches to its host element', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.debugElement.children[0];
    expect(host?.injector.get(NdTooltip)).toBeInstanceOf(NdTooltip);
  });
});
