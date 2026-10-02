import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NdDialog } from './dialog';

@Component({
  imports: [NdDialog],
  template: `<div ndDialog></div>`,
})
class TestHost {}

describe('NdDialog', () => {
  it('attaches to its host element', async () => {
    const fixture = TestBed.createComponent(TestHost);
    await fixture.whenStable();
    const host = fixture.debugElement.children[0];
    expect(host?.injector.get(NdDialog)).toBeInstanceOf(NdDialog);
  });
});
