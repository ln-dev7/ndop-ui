import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { connectedPositions } from './position';
import { injectNativePopover, nativePopoverPosition } from './native-popover';

const viewport = { width: 800, height: 600 };
const contentSize = { width: 120, height: 80 };

describe('native popover geometry', () => {
  it('uses the preferred placement and flips when its opposite fits', () => {
    const positions = connectedPositions(
      { side: 'bottom', align: 'start' },
      4,
      false,
    );
    expect(
      nativePopoverPosition(
        { left: 100, top: 100, width: 60, height: 30 },
        contentSize,
        positions,
        viewport,
        false,
      ),
    ).toMatchObject({
      left: 100,
      top: 134,
      position: positions[0],
      shifted: false,
    });
    expect(
      nativePopoverPosition(
        { left: 100, top: 560, width: 60, height: 30 },
        contentSize,
        positions,
        viewport,
        false,
      ),
    ).toMatchObject({
      left: 100,
      top: 476,
      position: positions[1],
      shifted: false,
    });
  });

  it('mirrors logical alignment and inline offsets in RTL', () => {
    const positions = connectedPositions(
      { side: 'end', align: 'center' },
      6,
      true,
    );
    expect(
      nativePopoverPosition(
        { left: 300, top: 100, width: 60, height: 30 },
        contentSize,
        positions,
        viewport,
        true,
      ),
    ).toMatchObject({ left: 174, top: 75, position: positions[0] });
  });

  it('chooses the least overflowing candidate and shifts it inside the viewport', () => {
    const positions = connectedPositions(
      { side: 'bottom', align: 'start' },
      4,
      false,
    );
    const result = nativePopoverPosition(
      { left: 790, top: 580, width: 10, height: 10 },
      contentSize,
      positions,
      viewport,
      false,
    );
    expect(result).toMatchObject({
      left: 672,
      top: 496,
      position: positions[1],
      shifted: true,
    });
  });
});

describe('native popover lifecycle', () => {
  let anchor: HTMLButtonElement;
  let content: HTMLDivElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    anchor = document.createElement('button');
    content = document.createElement('div');
    document.body.append(anchor, content);
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(100, 100, 60, 30),
    );
    vi.spyOn(content, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 120, 80),
    );
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    anchor.remove();
    content.remove();
    vi.restoreAllMocks();
  });

  it('synchronizes native dismissal and stops position listeners while closed', () => {
    const dismissed = vi.fn();
    const positioned = vi.fn();
    const controller = TestBed.runInInjectionContext(() =>
      injectNativePopover({
        anchor: () => anchor,
        positions: () =>
          connectedPositions({ side: 'bottom', align: 'start' }, 4, false),
        onDismiss: dismissed,
        onPosition: positioned,
      }),
    );
    controller.setElement(content);
    expect(controller.attach()).toBe(controller);
    expect(content.popover).toBe('auto');
    expect(content.matches(':popover-open')).toBe(true);
    expect(content.parentElement).toBe(document.body);
    expect(content.style.left).toBe('100px');
    expect(content.style.top).toBe('134px');
    expect(positioned).toHaveBeenCalledTimes(1);
    content.hidePopover();
    expect(dismissed).toHaveBeenCalledTimes(1);
    expect(controller.hasAttached()).toBe(false);
    window.dispatchEvent(new Event('resize'));
    expect(positioned).toHaveBeenCalledTimes(1);
    controller.attach();
    expect(controller.hasAttached()).toBe(true);
    TestBed.resetTestingModule();
    expect(content.matches(':popover-open')).toBe(false);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('ignores a queued stale close event after the element has reopened', () => {
    const dismissed = vi.fn();
    const controller = TestBed.runInInjectionContext(() =>
      injectNativePopover({
        anchor: () => anchor,
        positions: () =>
          connectedPositions({ side: 'bottom', align: 'center' }, 4, false),
        onDismiss: dismissed,
      }),
    );
    controller.setElement(content);
    controller.attach();
    const stale = new Event('toggle');
    Object.defineProperty(stale, 'newState', { value: 'closed' });
    content.dispatchEvent(stale);
    expect(controller.hasAttached()).toBe(true);
    expect(dismissed).not.toHaveBeenCalled();
  });

  it('closes and disconnects observers when its anchor is removed', async () => {
    const dismissed = vi.fn();
    const controller = TestBed.runInInjectionContext(() =>
      injectNativePopover({
        anchor: () => anchor,
        positions: () =>
          connectedPositions({ side: 'bottom', align: 'start' }, 4, false),
        onDismiss: dismissed,
      }),
    );
    controller.setElement(content);
    controller.attach();
    anchor.remove();
    await new Promise((resolve) => setTimeout(resolve));
    expect(controller.hasAttached()).toBe(false);
    expect(dismissed).toHaveBeenCalledTimes(1);
    document.body.append(document.createElement('span'));
    await new Promise((resolve) => setTimeout(resolve));
    expect(dismissed).toHaveBeenCalledTimes(1);
    document.body.lastElementChild?.remove();
  });

  it('uses a manual hint fallback that consumes Escape without closing its parent', () => {
    Object.defineProperty(content, 'popover', {
      configurable: true,
      get: () => content.getAttribute('popover'),
      set: (value: string) =>
        content.setAttribute('popover', value === 'hint' ? 'manual' : value),
    });
    const dismissed = vi.fn();
    const controller = TestBed.runInInjectionContext(() =>
      injectNativePopover({
        anchor: () => anchor,
        positions: () =>
          connectedPositions({ side: 'top', align: 'center' }, 4, false),
        mode: 'hint',
        onDismiss: dismissed,
      }),
    );
    controller.setElement(content);
    controller.attach();
    expect(content.popover).toBe('manual');
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    });
    document.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(controller.hasAttached()).toBe(false);
    expect(dismissed).toHaveBeenCalledTimes(1);
  });

  it('never calls a native browser method on the server', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const show = vi.spyOn(content, 'showPopover');
    const controller = TestBed.runInInjectionContext(() =>
      injectNativePopover({
        anchor: () => anchor,
        positions: () =>
          connectedPositions({ side: 'bottom', align: 'center' }, 4, false),
        onDismiss: vi.fn(),
      }),
    );
    controller.setElement(content);
    expect(controller.attach()).toBeNull();
    expect(show).not.toHaveBeenCalled();
  });
});
