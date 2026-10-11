import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular/zoneless';
import {
  NdCollapsible,
  NdCollapsibleContent,
  NdCollapsibleTrigger,
} from './collapsible';

const PARTS = [NdCollapsible, NdCollapsibleTrigger, NdCollapsibleContent];

describe('NdCollapsible', () => {
  it('starts closed: content hidden, trigger collapsed and wired to it', async () => {
    await render(
      `<div ndCollapsible data-testid="root">
        <button ndCollapsibleTrigger>More</button>
        <div ndCollapsibleContent data-testid="content">Details</div>
      </div>`,
      { imports: PARTS },
    );
    const trigger = screen.getByRole('button', { name: 'More' });
    const content = screen.getByTestId('content');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(trigger.getAttribute('type')).toBe('button');
    expect(content.hidden).toBe(true);
    expect(screen.getByTestId('root').getAttribute('data-state')).toBe(
      'closed',
    );
  });

  it('toggles on click and keeps its own content id', async () => {
    const { fixture } = await render(
      `<div ndCollapsible>
        <button ndCollapsibleTrigger>More</button>
        <div ndCollapsibleContent id="details">Details</div>
      </div>`,
      { imports: PARTS },
    );
    const trigger = screen.getByRole('button', { name: 'More' });
    trigger.click();
    await fixture.whenStable();
    const content = document.getElementById('details');
    expect(trigger.getAttribute('aria-controls')).toBe('details');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(content?.hidden).toBe(false);
    expect(content?.getAttribute('data-state')).toBe('open');
  });

  it('starts open with defaultOpen and follows a bound open state', async () => {
    @Component({
      imports: PARTS,
      template: `
        <div ndCollapsible defaultOpen data-testid="uncontrolled">
          <button ndCollapsibleTrigger>A</button>
          <div ndCollapsibleContent>A content</div>
        </div>
        <div ndCollapsible [(open)]="open">
          <button ndCollapsibleTrigger>B</button>
          <div ndCollapsibleContent data-testid="b">B content</div>
        </div>
      `,
    })
    class Host {
      readonly open = signal(false);
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect(
      fixture.nativeElement
        .querySelector('[data-testid=uncontrolled]')
        .getAttribute('data-state'),
    ).toBe('open');

    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-testid=b]').hidden).toBe(
      false,
    );

    (
      fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('sets the content height for animations, but not on the first render', async () => {
    const { fixture } = await render(
      `<div ndCollapsible>
        <button ndCollapsibleTrigger>More</button>
        <div ndCollapsibleContent data-testid="content">Details</div>
      </div>`,
      { imports: PARTS },
    );
    const content = screen.getByTestId('content');
    expect(content.style.animationName).toBe('none');
    // jsdom has no layout.
    Object.defineProperty(content, 'scrollHeight', { value: 64 });
    screen.getByRole('button', { name: 'More' }).click();
    await fixture.whenStable();
    expect(content.hidden).toBe(false);
    expect(content.style.animationName).toBe('');
    expect(
      content.style.getPropertyValue('--nd-collapsible-content-height'),
    ).toBe('64px');
    screen.getByRole('button', { name: 'More' }).click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    // No animation runs in jsdom, so it hides at once.
    expect(content.hidden).toBe(true);
  });

  it('does nothing while disabled', async () => {
    await render(
      `<div ndCollapsible disabled>
        <button ndCollapsibleTrigger>More</button>
        <div ndCollapsibleContent data-testid="content">Details</div>
      </div>`,
      { imports: PARTS },
    );
    const trigger = screen.getByRole('button', { name: 'More' });
    expect(trigger.hasAttribute('disabled')).toBe(true);
    expect(trigger.getAttribute('data-disabled')).toBe('');
  });
});
