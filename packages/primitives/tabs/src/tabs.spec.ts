import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import { NdTabs, NdTabsContent, NdTabsList, NdTabsTrigger } from './tabs';

const PARTS = [NdTabs, NdTabsList, NdTabsTrigger, NdTabsContent];

// The CDK key manager reads `keyCode`, which user-event doesn't set.
const KEY_CODES: Record<string, number> = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Home: 36,
  End: 35,
};

async function press(key: string): Promise<void> {
  fireEvent.keyDown(document.activeElement as HTMLElement, {
    key,
    keyCode: KEY_CODES[key],
  });
  await new Promise((resolve) => setTimeout(resolve));
}

@Component({
  imports: PARTS,
  template: `
    <div
      [attr.dir]="dir()"
      ndTabs
      [(value)]="value"
      [orientation]="orientation()"
      [activationMode]="mode()"
    >
      <div ndTabsList aria-label="Settings">
        <button ndTabsTrigger value="account">Account</button>
        <button ndTabsTrigger value="billing" disabled>Billing</button>
        <button ndTabsTrigger value="password">Password</button>
      </div>
      <div ndTabsContent value="account">Account panel</div>
      <div ndTabsContent value="billing">Billing panel</div>
      <div ndTabsContent value="password">Password panel</div>
    </div>
  `,
})
class Host {
  readonly value = signal<string | null>('account');
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly mode = signal<'automatic' | 'manual'>('automatic');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
}

describe('NdTabs', () => {
  it('links each tab to its panel and shows only the selected one', async () => {
    await render(Host);
    const list = screen.getByRole('tablist', { name: 'Settings' });
    expect(list.getAttribute('aria-orientation')).toBe('horizontal');
    const [account, , password] = screen.getAllByRole('tab');
    expect(account?.getAttribute('aria-selected')).toBe('true');
    expect(account?.getAttribute('tabindex')).toBe('0');
    expect(password?.getAttribute('tabindex')).toBe('-1');
    const panel = screen.getByRole('tabpanel', { name: 'Account' });
    expect(panel.id).toBe(account?.getAttribute('aria-controls'));
    expect(panel.getAttribute('tabindex')).toBe('0');
    expect(screen.getByText('Password panel').hidden).toBe(true);
  });

  it('selects on click', async () => {
    const view = await render(Host);
    fireEvent.click(screen.getByRole('tab', { name: 'Password' }));
    await view.fixture.whenStable();
    expect(view.fixture.componentInstance.value()).toBe('password');
    expect(screen.getByText('Password panel').hidden).toBe(false);
  });

  it('moves and selects with arrow keys, skipping disabled tabs', async () => {
    const view = await render(Host);
    screen.getByRole('tab', { name: 'Account' }).focus();
    await press('ArrowRight');
    expect(document.activeElement?.textContent).toBe('Password');
    expect(view.fixture.componentInstance.value()).toBe('password');
    await press('ArrowRight');
    expect(document.activeElement?.textContent).toBe('Account');
    await press('End');
    expect(document.activeElement?.textContent).toBe('Password');
    await press('Home');
    expect(view.fixture.componentInstance.value()).toBe('account');
  });

  it('mirrors arrow keys in right-to-left layouts', async () => {
    const view = await render(Host);
    view.fixture.componentInstance.dir.set('rtl');
    await view.fixture.whenStable();
    screen.getByRole('tab', { name: 'Account' }).focus();
    await press('ArrowLeft');
    expect(document.activeElement?.textContent).toBe('Password');
  });

  it('only moves focus in manual mode', async () => {
    const view = await render(Host);
    view.fixture.componentInstance.mode.set('manual');
    await view.fixture.whenStable();
    screen.getByRole('tab', { name: 'Account' }).focus();
    await press('ArrowRight');
    expect(document.activeElement?.textContent).toBe('Password');
    expect(view.fixture.componentInstance.value()).toBe('account');
  });

  it('uses the vertical arrow keys in a vertical list', async () => {
    const view = await render(Host);
    view.fixture.componentInstance.orientation.set('vertical');
    await view.fixture.whenStable();
    screen.getByRole('tab', { name: 'Account' }).focus();
    await press('ArrowRight');
    expect(document.activeElement?.textContent).toBe('Account');
    await press('ArrowDown');
    expect(document.activeElement?.textContent).toBe('Password');
  });

  it('renders the default tab before any interaction', async () => {
    await render(
      `<div ndTabs defaultValue="b">
        <div ndTabsList aria-label="Letters">
          <button ndTabsTrigger value="a">A</button>
          <button ndTabsTrigger value="b">B</button>
        </div>
        <div ndTabsContent value="a">A panel</div>
        <div ndTabsContent value="b">B panel</div>
      </div>`,
      { imports: PARTS },
    );
    expect(screen.getByText('B panel').hidden).toBe(false);
    expect(screen.getByText('A panel').hidden).toBe(true);
  });
});
