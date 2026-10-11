import { Component, signal } from '@angular/core';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdNavigationMenu,
  NdNavigationMenuContent,
  NdNavigationMenuItem,
  NdNavigationMenuLink,
  NdNavigationMenuList,
  NdNavigationMenuTrigger,
} from './navigation-menu';

@Component({
  imports: [
    NdNavigationMenu,
    NdNavigationMenuList,
    NdNavigationMenuItem,
    NdNavigationMenuTrigger,
    NdNavigationMenuContent,
    NdNavigationMenuLink,
  ],
  template: `
    <nav
      ndNavigationMenu
      aria-label="Main"
      [(value)]="value"
      [openDelay]="0"
      [closeDelay]="0"
    >
      <ul ndNavigationMenuList>
        <li ndNavigationMenuItem value="docs">
          <button ndNavigationMenuTrigger>Docs</button>
          <div ndNavigationMenuContent>
            <a ndNavigationMenuLink href="#install">Installation</a>
            <a ndNavigationMenuLink href="#theming">Theming</a>
          </div>
        </li>
        <li ndNavigationMenuItem value="components">
          <button ndNavigationMenuTrigger>Components</button>
          <div ndNavigationMenuContent>
            <a ndNavigationMenuLink href="#button">Button</a>
          </div>
        </li>
        <li ndNavigationMenuItem>
          <a ndNavigationMenuLink href="#blog" active>Blog</a>
        </li>
      </ul>
    </nav>
    <button>Outside</button>
  `,
})
class Host {
  readonly value = signal<string | null>(null);
}

async function stable(view: Awaited<ReturnType<typeof render>>) {
  await new Promise((resolve) => setTimeout(resolve, 5));
  await view.fixture.whenStable();
}

describe('NdNavigationMenu', () => {
  it('is a list of disclosure buttons with their panels in place', async () => {
    await render(Host);
    const docs = screen.getByRole('button', { name: 'Docs' });
    expect(docs.getAttribute('aria-expanded')).toBe('false');
    const panel = document.getElementById(
      docs.getAttribute('aria-controls') ?? '',
    );
    expect(panel?.hidden).toBe(true);
    expect(docs.nextElementSibling).toBe(panel);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Blog' }).getAttribute('aria-current'),
    ).toBe('page');
  });

  it('toggles a panel on click and keeps one open at a time', async () => {
    const view = await render(Host);
    fireEvent.click(screen.getByRole('button', { name: 'Docs' }));
    await stable(view);
    expect(view.fixture.componentInstance.value()).toBe('docs');
    expect(screen.getByRole('link', { name: 'Installation' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Components' }));
    await stable(view);
    expect(view.fixture.componentInstance.value()).toBe('components');
    fireEvent.click(screen.getByRole('button', { name: 'Components' }));
    await stable(view);
    expect(view.fixture.componentInstance.value()).toBeNull();
  });

  it('opens on hover and closes when the pointer leaves the item', async () => {
    const view = await render(Host);
    const docs = screen.getByRole('button', { name: 'Docs' });
    fireEvent.pointerEnter(docs, { pointerType: 'mouse' });
    await stable(view);
    expect(view.fixture.componentInstance.value()).toBe('docs');
    fireEvent.click(docs);
    await stable(view);
    expect(view.fixture.componentInstance.value()).toBe('docs');
    fireEvent.pointerLeave(docs.closest('li') as HTMLElement, {
      pointerType: 'mouse',
    });
    await stable(view);
    expect(view.fixture.componentInstance.value()).toBeNull();
  });

  it('closes on Escape and returns focus to the button', async () => {
    const view = await render(Host);
    const docs = screen.getByRole('button', { name: 'Docs' });
    fireEvent.keyDown(docs, { key: 'ArrowDown' });
    await stable(view);
    expect(document.activeElement?.textContent).toBe('Installation');
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: 'Escape',
    });
    await stable(view);
    expect(view.fixture.componentInstance.value()).toBeNull();
    expect(document.activeElement).toBe(docs);
  });

  it('moves between top-level items with the arrow keys', async () => {
    await render(Host);
    screen.getByRole('button', { name: 'Docs' }).focus();
    const press = (key: string) =>
      fireEvent.keyDown(document.activeElement as HTMLElement, { key });
    press('ArrowRight');
    expect(document.activeElement?.textContent).toBe('Components');
    press('End');
    expect(document.activeElement?.textContent).toBe('Blog');
    press('ArrowRight');
    expect(document.activeElement?.textContent).toBe('Docs');
    press('ArrowLeft');
    expect(document.activeElement?.textContent).toBe('Blog');
    press('Home');
    expect(document.activeElement?.textContent).toBe('Docs');
  });

  it('closes when focus leaves the navigation', async () => {
    const view = await render(Host);
    fireEvent.click(screen.getByRole('button', { name: 'Docs' }));
    await stable(view);
    fireEvent.focusOut(screen.getByRole('button', { name: 'Docs' }), {
      relatedTarget: screen.getByRole('button', { name: 'Outside' }),
    });
    await stable(view);
    expect(view.fixture.componentInstance.value()).toBeNull();
  });
});
