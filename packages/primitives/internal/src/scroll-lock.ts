import { DestroyRef, DOCUMENT, inject } from '@angular/core';

const locks = new WeakMap<Document, { count: number; restore(): void }>();

/** A shared, reference-counted lock for native modal document scrolling. */
export interface NdModalScrollLock {
  /** Freezes the current document position until the last modal closes. */
  acquire(): void;
  /** Releases this modal's lock, preserving any other open modal's lock. */
  release(): void;
}

/**
 * Preserves document scroll for native dialogs, which make the page inert
 * without blocking its viewport scrolling. A fixed body also covers WebKit's
 * inconsistent root-overflow handling while a top-layer modal is open.
 * Call only `acquire` after hydration; creating the controller is SSR safe.
 *
 * @returns A lock released automatically when its owning directive is destroyed.
 */
export function injectModalScrollLock(): NdModalScrollLock {
  const document = inject(DOCUMENT);
  let held = false;
  const release = () => {
    if (!held) return;
    held = false;
    const lock = locks.get(document);
    if (lock && --lock.count === 0) {
      locks.delete(document);
      lock.restore();
    }
  };
  inject(DestroyRef).onDestroy(release);
  return {
    acquire() {
      if (held || !document.defaultView) return;
      held = true;
      const existing = locks.get(document);
      if (existing) {
        existing.count++;
        return;
      }
      const window = document.defaultView;
      const body = document.body;
      const { scrollX, scrollY } = window;
      const properties = [
        'position',
        'top',
        'left',
        'width',
        'overflow',
        'padding-inline-end',
      ];
      const previous = properties.map((name) => ({
        name,
        value: body.style.getPropertyValue(name),
        priority: body.style.getPropertyPriority(name),
      }));
      const scrollbar = Math.max(
        0,
        window.innerWidth - document.documentElement.clientWidth,
      );
      const padding = window.getComputedStyle(body).paddingInlineEnd;
      body.style.position = 'fixed';
      body.style.top = `${-scrollY}px`;
      body.style.left = `${-scrollX}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      if (scrollbar)
        body.style.paddingInlineEnd = `calc(${padding || '0px'} + ${scrollbar}px)`;
      locks.set(document, {
        count: 1,
        restore() {
          for (const { name, value, priority } of previous) {
            if (value) body.style.setProperty(name, value, priority);
            else body.style.removeProperty(name);
          }
          window.scrollTo(scrollX, scrollY);
        },
      });
    },
    release,
  };
}
