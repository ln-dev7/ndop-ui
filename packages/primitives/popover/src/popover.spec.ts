import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NdPopover } from './popover';

@Component({
  imports: [NdPopover],
  template: `<div ndPopover></div>`,
})
class TestHost {}

describe('NdPopover', () => {
  it('attaches to its host element', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.debugElement.children[0];
    expect(host?.injector.get(NdPopover)).toBeInstanceOf(NdPopover);
  });
});
