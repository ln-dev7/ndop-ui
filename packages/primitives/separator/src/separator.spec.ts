import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NdSeparator } from './separator';

@Component({
  imports: [NdSeparator],
  template: `<div ndSeparator></div>`,
})
class TestHost {}

describe('NdSeparator', () => {
  it('attaches to its host element', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.debugElement.children[0];
    expect(host?.injector.get(NdSeparator)).toBeInstanceOf(NdSeparator);
  });
});
