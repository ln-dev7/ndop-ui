import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NdLabel } from './label';

@Component({
  imports: [NdLabel],
  template: `<div ndLabel></div>`,
})
class TestHost {}

describe('NdLabel', () => {
  it('attaches to its host element', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.debugElement.children[0];
    expect(host?.injector.get(NdLabel)).toBeInstanceOf(NdLabel);
  });
});
