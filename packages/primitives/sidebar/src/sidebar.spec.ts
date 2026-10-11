import { Component, signal, viewChild } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdSidebar,
  NdSidebarContainer,
  NdSidebarGap,
  NdSidebarMenuButton,
  NdSidebarProvider,
  NdSidebarRail,
  NdSidebarTrigger,
  type NdSidebarCollapsible,
} from './sidebar';

@Component({
  imports: [
    NdSidebarProvider,
    NdSidebar,
    NdSidebarGap,
    NdSidebarContainer,
    NdSidebarTrigger,
    NdSidebarRail,
    NdSidebarMenuButton,
  ],
  template: `
    <div ndSidebarProvider [(open)]="open" [(openMobile)]="openMobile">
      <div ndSidebar data-testid="sidebar" [collapsible]="collapsible()">
        <div ndSidebarGap data-testid="gap"></div>
        <div ndSidebarContainer aria-label="Main" data-testid="container">
          <a ndSidebarMenuButton href="#inbox" active>Inbox</a>
          <a ndSidebarMenuButton href="#drafts">Drafts</a>
          <button ndSidebarMenuButton>Projects</button>
          <button ndSidebarRail title="Toggle sidebar"></button>
        </div>
      </div>
      <main>
        <button ndSidebarTrigger>Toggle sidebar</button>
      </main>
    </div>
  `,
})
class Host {
  readonly open = signal(true);
  readonly openMobile = signal(false);
  readonly collapsible = signal<NdSidebarCollapsible>('offcanvas');
  readonly provider = viewChild.required(NdSidebarProvider);
}

async function setup() {
  const view = await render(Host);
  const host = view.fixture.componentInstance;
  const settle = async () => {
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
  };
  return { host, settle };
}

describe('NdSidebar', () => {
  it('toggles the desktop sidebar from its trigger, wired to the panel', async () => {
    const { host, settle } = await setup();
    const trigger = screen.getByRole('button', { name: 'Toggle sidebar' });
    const container = screen.getByTestId('container');
    expect(trigger.getAttribute('aria-controls')).toBe(container.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('sidebar').getAttribute('data-state')).toBe(
      'expanded',
    );
    fireEvent.click(trigger);
    await settle();
    expect(host.open()).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('sidebar').getAttribute('data-collapsible')).toBe(
      'offcanvas',
    );
  });

  it('makes the off-canvas panel inert, but not the icon one', async () => {
    const { host, settle } = await setup();
    host.open.set(false);
    await settle();
    const container = screen.getByTestId('container');
    expect(container.hasAttribute('inert')).toBe(true);
    host.collapsible.set('icon');
    await settle();
    expect(container.hasAttribute('inert')).toBe(false);
  });

  it('toggles with Ctrl+B', async () => {
    const { host, settle } = await setup();
    fireEvent.keyDown(document, { key: 'b', ctrlKey: true });
    await settle();
    expect(host.open()).toBe(false);
    fireEvent.keyDown(document, { key: 'B', metaKey: true });
    await settle();
    expect(host.open()).toBe(true);
  });

  it('marks the current page and keeps the rail out of reach', async () => {
    await setup();
    expect(
      screen.getByRole('link', { name: 'Inbox' }).getAttribute('aria-current'),
    ).toBe('page');
    const rail = document.querySelector('[ndSidebarRail]');
    expect(rail?.getAttribute('aria-hidden')).toBe('true');
    expect(rail?.getAttribute('tabindex')).toBe('-1');
    expect(screen.getByTestId('gap').getAttribute('aria-hidden')).toBe('true');
  });

  it('opens on mobile as a modal dialog that a link, not a button, closes', async () => {
    const { host, settle } = await setup();
    host.provider().isMobile.set(true);
    await settle();
    const container = screen.getByTestId('container');
    expect(container.hidden).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    await settle();
    expect(host.openMobile()).toBe(true);
    expect(host.open()).toBe(true);
    expect(container.hidden).toBe(false);
    expect(screen.getByRole('dialog', { name: 'Main' })).toBe(container);
    expect(container.getAttribute('aria-modal')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    await settle();
    expect(host.openMobile()).toBe(true);
    fireEvent.click(screen.getByRole('link', { name: 'Drafts' }));
    await settle();
    expect(host.openMobile()).toBe(false);
  });
});
