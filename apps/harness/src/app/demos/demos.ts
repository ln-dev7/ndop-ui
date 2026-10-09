/**
 * A primitive demo route in the harness.
 */
export interface Demo {
  /** Route path, under `/primitives/`. */
  path: string;
  /** Primitive name shown in the index. */
  title: string;
}

/**
 * Every primitive demo. The home page links each one, so prerendering with
 * route discovery reaches them all, and the e2e suite iterates this list
 * for its axe and hydration checks.
 */
export const DEMOS: readonly Demo[] = [
  { path: 'separator', title: 'Separator' },
  { path: 'input', title: 'Input and Label' },
  { path: 'button', title: 'Button' },
  { path: 'dialog', title: 'Dialog' },
  { path: 'popover', title: 'Popover' },
  { path: 'tooltip', title: 'Tooltip' },
  { path: 'collapsible', title: 'Collapsible' },
  { path: 'avatar', title: 'Avatar' },
  { path: 'progress', title: 'Progress' },
  { path: 'checkbox', title: 'Checkbox' },
  { path: 'switch', title: 'Switch' },
  { path: 'toggle', title: 'Toggle' },
  { path: 'radio-group', title: 'Radio Group' },
  { path: 'toggle-group', title: 'Toggle Group' },
  { path: 'slider', title: 'Slider' },
  { path: 'input-otp', title: 'Input OTP' },
  { path: 'form-field', title: 'Form Field' },
];
