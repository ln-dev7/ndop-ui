/**
 * Keeps a same-origin iframe as tall as the page in it, so the frame never
 * scrolls on its own and the wheel always scrolls the page around it
 * (ADR-0022). Call it when the frame loads.
 *
 * It measures when the page's height can change: now, when the frame's
 * viewport resizes, when its DOM changes, and when a transition or
 * animation ends. A `ResizeObserver` on the page's root would see every
 * height this sets, which resizes the frame's viewport during the
 * observer's own delivery, and the browser reports a resize loop.
 *
 * @param frame - The iframe, loaded.
 * @param minHeight - The least height, in pixels.
 * @param onHeight - Receives each new height, in pixels.
 * @returns A function that stops measuring.
 */
export function fitFrameToContent(
  frame: HTMLIFrameElement,
  minHeight: number,
  onHeight: (height: number) => void,
): () => void {
  const page = frame.contentDocument;
  const inner = frame.contentWindow;
  const outer = frame.ownerDocument.defaultView;
  if (!page || !inner || !outer) return () => undefined;
  const root = page.documentElement;
  let pending = 0;
  const measure = () => {
    outer.cancelAnimationFrame(pending);
    pending = outer.requestAnimationFrame(() =>
      onHeight(Math.max(minHeight, root.scrollHeight)),
    );
  };
  const mutations = new MutationObserver(measure);
  mutations.observe(page.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  const events = ['resize', 'transitionend', 'animationend'] as const;
  for (const type of events) inner.addEventListener(type, measure);
  measure();
  return () => {
    outer.cancelAnimationFrame(pending);
    mutations.disconnect();
    for (const type of events) inner.removeEventListener(type, measure);
  };
}
