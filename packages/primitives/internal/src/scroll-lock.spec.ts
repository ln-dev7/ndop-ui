import { TestBed } from '@angular/core/testing';
import { injectModalScrollLock } from './scroll-lock';

const originalScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
let originalStyle: string | null;

beforeEach(() => {
  TestBed.configureTestingModule({});
  originalStyle = document.body.getAttribute('style');
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 400 });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  TestBed.resetTestingModule();
  if (originalStyle === null) document.body.removeAttribute('style');
  else document.body.setAttribute('style', originalStyle);
  if (originalScrollY)
    Object.defineProperty(window, 'scrollY', originalScrollY);
  vi.restoreAllMocks();
});

describe('native modal scroll lock', () => {
  it('restores existing inline styles and document position after the last modal', () => {
    document.body.style.setProperty('position', 'relative', 'important');
    document.body.style.top = '8px';
    const first = TestBed.runInInjectionContext(injectModalScrollLock);
    const nested = TestBed.runInInjectionContext(injectModalScrollLock);
    first.acquire();
    nested.acquire();
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-400px');
    nested.release();
    expect(document.body.style.position).toBe('fixed');
    expect(window.scrollTo).not.toHaveBeenCalled();
    first.release();
    expect(document.body.style.position).toBe('relative');

    expect(document.body.style.top).toBe('8px');
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith(0, 400);
  });

  it('clamps only the viewport while locked and removes the guard before restoring', () => {
    const lock = TestBed.runInInjectionContext(injectModalScrollLock);
    lock.acquire();
    const scroller = document.createElement('div');
    document.body.append(scroller);
    scroller.dispatchEvent(new Event('scroll'));
    expect(window.scrollTo).not.toHaveBeenCalled();
    scroller.remove();
    window.dispatchEvent(new Event('scroll'));
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
    vi.mocked(window.scrollTo).mockClear();
    lock.release();
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith(0, 400);
    vi.mocked(window.scrollTo).mockClear();
    window.dispatchEvent(new Event('scroll'));
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('makes repeated acquire and release idempotent and releases on destruction', () => {
    const lock = TestBed.runInInjectionContext(injectModalScrollLock);
    lock.acquire();
    lock.acquire();
    lock.release();
    lock.release();
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    lock.acquire();
    expect(document.body.style.position).toBe('fixed');
    TestBed.resetTestingModule();
    expect(document.body.style.position).not.toBe('fixed');
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });
});
