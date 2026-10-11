import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdAccordion,
  NdAccordionContent,
  NdAccordionHeader,
  NdAccordionItem,
  NdAccordionTrigger,
} from './accordion';

const PARTS = [
  NdAccordion,
  NdAccordionItem,
  NdAccordionHeader,
  NdAccordionTrigger,
  NdAccordionContent,
];

@Component({
  imports: PARTS,
  template: `
    <div
      ndAccordion
      [(value)]="value"
      [multiple]="multiple()"
      [collapsible]="collapsible()"
    >
      @for (section of sections; track section) {
        <div
          ndAccordionItem
          [value]="section"
          [disabled]="section === 'returns'"
        >
          <h3 ndAccordionHeader>
            <button ndAccordionTrigger>{{ section }}</button>
          </h3>
          <div ndAccordionContent>{{ section }} details</div>
        </div>
      }
    </div>
  `,
})
class Host {
  readonly sections = ['shipping', 'returns', 'warranty', 'support'];
  readonly value = signal<readonly string[]>([]);
  readonly multiple = signal(false);
  readonly collapsible = signal(false);
}

async function click(
  view: Awaited<ReturnType<typeof render>>,
  name: string,
): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name }));
  await view.fixture.whenStable();
}

describe('NdAccordion', () => {
  it('links each trigger to its region and keeps closed content hidden', async () => {
    await render(Host);
    const trigger = screen.getByRole('button', { name: 'shipping' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const content = screen.getByText('shipping details');
    expect(content.id).toBe(trigger.getAttribute('aria-controls'));
    expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(content.getAttribute('role')).toBe('region');
    expect(content.hidden).toBe(true);
  });

  it('opens one item at a time and keeps it open unless collapsible', async () => {
    const view = await render(Host);
    await click(view, 'shipping');
    expect(screen.getByText('shipping details').hidden).toBe(false);
    const trigger = screen.getByRole('button', { name: 'shipping' });
    expect(trigger.getAttribute('aria-disabled')).toBe('true');
    await click(view, 'shipping');
    expect(view.fixture.componentInstance.value()).toEqual(['shipping']);
    await click(view, 'warranty');
    expect(view.fixture.componentInstance.value()).toEqual(['warranty']);
    expect(screen.getByText('shipping details').hidden).toBe(true);

    view.fixture.componentInstance.collapsible.set(true);
    await view.fixture.whenStable();
    await click(view, 'warranty');
    expect(view.fixture.componentInstance.value()).toEqual([]);
  });

  it('opens several items with multiple', async () => {
    const view = await render(Host);
    view.fixture.componentInstance.multiple.set(true);
    await view.fixture.whenStable();
    await click(view, 'shipping');
    await click(view, 'warranty');
    expect(view.fixture.componentInstance.value()).toEqual([
      'shipping',
      'warranty',
    ]);
    await click(view, 'shipping');
    expect(view.fixture.componentInstance.value()).toEqual(['warranty']);
  });

  it('moves focus between enabled triggers with the arrow keys', async () => {
    await render(Host);
    screen.getByRole('button', { name: 'shipping' }).focus();
    const press = (key: string) =>
      fireEvent.keyDown(document.activeElement as HTMLElement, { key });
    press('ArrowDown');
    expect(document.activeElement?.textContent).toBe('warranty');
    press('End');
    expect(document.activeElement?.textContent).toBe('support');
    press('ArrowDown');
    expect(document.activeElement?.textContent).toBe('shipping');
    press('ArrowUp');
    expect(document.activeElement?.textContent).toBe('support');
    press('Home');
    expect(document.activeElement?.textContent).toBe('shipping');
  });

  it('disables an item’s trigger', async () => {
    await render(Host);
    const trigger = screen.getByRole('button', { name: 'returns' });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    expect(trigger.closest('[data-disabled]')).not.toBeNull();
  });

  it('sets the content height for animations, but not on the first render', async () => {
    const view = await render(Host);
    const content = screen.getByText('shipping details');
    expect(content.style.animationName).toBe('none');
    // jsdom has no layout.
    Object.defineProperty(content, 'scrollHeight', { value: 48 });
    await click(view, 'shipping');
    expect(content.style.animationName).toBe('');
    expect(
      content.style.getPropertyValue('--nd-accordion-content-height'),
    ).toBe('48px');
  });

  it('renders default items open before any interaction', async () => {
    await render(
      `<div ndAccordion multiple [defaultValue]="['a', 'b']">
        <div ndAccordionItem value="a">
          <h3 ndAccordionHeader><button ndAccordionTrigger>A</button></h3>
          <div ndAccordionContent>A body</div>
        </div>
        <div ndAccordionItem value="b">
          <h3 ndAccordionHeader><button ndAccordionTrigger>B</button></h3>
          <div ndAccordionContent>B body</div>
        </div>
      </div>`,
      { imports: PARTS },
    );
    expect(screen.getByText('A body').hidden).toBe(false);
    expect(screen.getByText('B body').hidden).toBe(false);
    expect(
      screen.getByRole('heading', { name: 'A' }).getAttribute('data-state'),
    ).toBe('open');
  });
});
