import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NdButton } from './button';

@Component({
  imports: [NdButton],
  template: `<div ndButton></div>`,
})
class TestHost {}

describe('NdButton', () => {
  it('attaches to its host element', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.debugElement.children[0];
    expect(host?.injector.get(NdButton)).toBeInstanceOf(NdButton);
  });
});
