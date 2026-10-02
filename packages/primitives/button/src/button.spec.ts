import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { NdButton } from './button';

@Component({
  imports: [NdButton],
  template: `
    <form (submit)="submits = submits + 1; $event.preventDefault()">
      <button ndButton (click)="clicks.set(clicks() + 1)" [disabled]="off()">
        Plain
      </button>
      <button ndButton type="submit">Submit</button>
      <a
        ndButton
        href="#target"
        tabindex="2"
        (click)="linkClicks.set(linkClicks() + 1)"
        [disabled]="off()"
        >Link</a
      >
    </form>
  `,
})
class Host {
  readonly clicks = signal(0);
  readonly linkClicks = signal(0);
  readonly off = signal(false);
  submits = 0;
}

async function setup() {
  const view = await render(Host);
  const host = view.fixture.componentInstance;
  const disable = async () => {
    host.off.set(true);
    await view.fixture.whenStable();
  };
  return { host, disable };
}

describe('NdButton', () => {
  describe('on a button', () => {
    it('defaults to type="button" and keeps an explicit type', async () => {
      await setup();
      expect(
        screen.getByRole('button', { name: 'Plain' }).getAttribute('type'),
      ).toBe('button');
      expect(
        screen.getByRole('button', { name: 'Submit' }).getAttribute('type'),
      ).toBe('submit');
    });

    it('does not submit its form', async () => {
      const { host } = await setup();
      await userEvent.click(screen.getByRole('button', { name: 'Plain' }));
      expect(host.clicks()).toBe(1);
      expect(host.submits).toBe(0);
    });

    it('uses the native disabled attribute', async () => {
      const { host, disable } = await setup();
      await disable();
      const button = screen.getByRole('button', { name: 'Plain' });
      expect(button.hasAttribute('disabled')).toBe(true);
      expect(button.hasAttribute('data-disabled')).toBe(true);
      expect(button.hasAttribute('aria-disabled')).toBe(false);

      await userEvent.click(button);
      expect(host.clicks()).toBe(0);
    });
  });

  describe('on a link', () => {
    it('keeps link semantics and its own tabindex while enabled', async () => {
      await setup();
      const link = screen.getByRole('link', { name: 'Link' });
      expect(link.getAttribute('tabindex')).toBe('2');
      expect(link.hasAttribute('aria-disabled')).toBe(false);
      expect(link.hasAttribute('type')).toBe(false);
    });

    it('is announced disabled, leaves the tab order and cancels clicks', async () => {
      const { host, disable } = await setup();
      await disable();
      const link = screen.getByRole('link', { name: 'Link' });
      expect(link.getAttribute('aria-disabled')).toBe('true');
      expect(link.getAttribute('tabindex')).toBe('-1');
      expect(link.hasAttribute('data-disabled')).toBe(true);

      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(host.linkClicks()).toBe(0);
    });
  });
});
