import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NdInput } from './input';

@Component({
  imports: [NdInput],
  template: `<div ndInput></div>`,
})
class TestHost {}

describe('NdInput', () => {
  it('attaches to its host element', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.debugElement.children[0];
    expect(host?.injector.get(NdInput)).toBeInstanceOf(NdInput);
  });
});
