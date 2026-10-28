import { screen } from '@testing-library/angular/zoneless';

it('resolves mocked popover visibility without recursively computing its own style', () => {
  const content = document.createElement('div');
  content.popover = 'auto';
  content.setAttribute('role', 'tooltip');
  content.textContent = 'Native hint';
  content.style.color = 'rgb(12, 34, 56)';
  content.style.padding = '7px';
  document.body.append(content);
  const computedStyle = window.getComputedStyle;
  const depths = new Map<Element, number>();
  let maximum = 0;
  const spy = vi
    .spyOn(window, 'getComputedStyle')
    .mockImplementation((element, pseudo) => {
      const depth = (depths.get(element) ?? 0) + 1;
      depths.set(element, depth);
      maximum = Math.max(maximum, depth);
      try {
        return computedStyle.call(window, element, pseudo);
      } finally {
        depths.set(element, depth - 1);
      }
    });
  try {
    expect(window.getComputedStyle(content).display).toBe('none');
    expect(screen.queryByRole('tooltip')).toBeNull();
    content.showPopover();
    expect(window.getComputedStyle(content).display).toBe('block');
    expect(window.getComputedStyle(content).color).toBe('rgb(12, 34, 56)');
    expect(window.getComputedStyle(content).padding).toBe('7px');
    expect(screen.getByRole('tooltip')).toBe(content);
    content.style.visibility = 'hidden';
    expect(screen.queryByRole('tooltip')).toBeNull();
    content.style.visibility = 'visible';
    expect(screen.getByRole('tooltip')).toBe(content);
    content.hidePopover();
    expect(window.getComputedStyle(content).display).toBe('none');
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(maximum).toBeLessThanOrEqual(2);
  } finally {
    spy.mockRestore();
    content.remove();
  }
});
