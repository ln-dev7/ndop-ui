import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdCommand,
  NdCommandEmpty,
  NdCommandGroup,
  NdCommandGroupHeading,
  NdCommandInput,
  NdCommandItem,
  NdCommandList,
  NdCommandSeparator,
} from './command';

@Component({
  imports: [
    NdCommand,
    NdCommandInput,
    NdCommandList,
    NdCommandEmpty,
    NdCommandGroup,
    NdCommandGroupHeading,
    NdCommandItem,
    NdCommandSeparator,
  ],
  template: `
    <div ndCommand label="Commands" [(search)]="search">
      <input ndCommandInput placeholder="Type a command…" />
      <div ndCommandList>
        <div ndCommandEmpty>No results.</div>
        <div ndCommandGroup>
          <div ndCommandGroupHeading>Suggestions</div>
          <div ndCommandItem (triggered)="ran.set('calendar')">Calendar</div>
          <div ndCommandItem keywords="smiley" (triggered)="ran.set('emoji')">
            Search emoji
          </div>
          <div ndCommandItem disabled>Calculator</div>
        </div>
        <div ndCommandSeparator data-testid="separator"></div>
        <div ndCommandGroup>
          <div ndCommandGroupHeading>Settings</div>
          @for (name of settings; track name) {
            <div ndCommandItem (triggered)="ran.set(name)">{{ name }}</div>
          }
        </div>
      </div>
    </div>
  `,
})
class Host {
  readonly search = signal('');
  readonly ran = signal<string | null>(null);
  readonly settings = ['Profile', 'Billing'];
}

async function setup() {
  const view = await render(Host);
  await view.fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await view.fixture.whenStable();
  const input = screen.getByRole('combobox', { name: 'Commands' });
  const type = async (text: string) => {
    fireEvent.input(input, { target: { value: text } });
    await view.fixture.whenStable();
  };
  const press = async (key: string) => {
    fireEvent.keyDown(input, { key, keyCode: KEY_CODES[key] });
    await view.fixture.whenStable();
  };
  return { host: view.fixture.componentInstance, input, type, press };
}

// The CDK key manager reads `keyCode`, which fireEvent doesn't derive.
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  Enter: 13,
};

function active(input: HTMLElement): HTMLElement | null {
  return document.getElementById(
    input.getAttribute('aria-activedescendant') ?? '',
  );
}

describe('NdCommand', () => {
  it('is a combobox controlling a named listbox, highlighting the first item', async () => {
    const { input } = await setup();
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('listbox', { name: 'Commands' });
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    expect(active(input)?.textContent?.trim()).toBe('Calendar');
    expect(active(input)?.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('group', { name: 'Suggestions' })).toBeTruthy();
    expect(screen.getByText('No results.').hidden).toBe(true);
  });

  it('moves the highlight with the arrow keys, skipping disabled items', async () => {
    const { input, press } = await setup();
    await press('ArrowDown');
    expect(active(input)?.textContent?.trim()).toBe('Search emoji');
    await press('ArrowDown');
    expect(active(input)?.textContent?.trim()).toBe('Profile');
    await press('ArrowUp');
    expect(active(input)?.textContent?.trim()).toBe('Search emoji');
  });

  it('filters by text and keywords and hides empty groups', async () => {
    const { host, input, type } = await setup();
    await type('smil');
    expect(host.search()).toBe('smil');
    expect(screen.getByText('Calendar').hidden).toBe(true);
    expect(active(input)?.textContent?.trim()).toBe('Search emoji');
    expect(screen.getByText('Settings').closest('[role=group]')).toHaveProperty(
      'hidden',
      true,
    );
    expect(screen.getByTestId('separator').hidden).toBe(true);
    await type('zzz');
    expect(screen.getByText('No results.').hidden).toBe(false);
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('runs the highlighted item on Enter and an item on click', async () => {
    const { host, press } = await setup();
    await press('Enter');
    expect(host.ran()).toBe('calendar');
    fireEvent.click(screen.getByText('Billing'));
    expect(host.ran()).toBe('Billing');
    fireEvent.click(screen.getByText('Calculator'));
    expect(host.ran()).toBe('Billing');
  });

  it('highlights an item when the pointer moves over it', async () => {
    const { input } = await setup();
    fireEvent.pointerMove(screen.getByText('Profile'));
    await new Promise((resolve) => setTimeout(resolve));
    expect(active(input)?.textContent?.trim()).toBe('Profile');
  });
});
