import { resource } from '@angular/core';

/** Where a task is in its life. */
export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'canceled';

/** How urgent a task is. */
export type TaskPriority = 'low' | 'medium' | 'high';

/** What kind of work a task is. */
export type TaskLabel = 'bug' | 'feature' | 'documentation';

/** A task in the table. */
export interface Task {
  /** Its id, such as `TASK-8782`. */
  readonly id: string;
  /** What needs doing. */
  readonly title: string;
  /** Where it is in its life. */
  readonly status: TaskStatus;
  /** How urgent it is. */
  readonly priority: TaskPriority;
  /** What kind of work it is. */
  readonly label: TaskLabel;
}

/** The statuses, in the order they sort and are listed. */
export const TASK_STATUSES: readonly TaskStatus[] = [
  'todo',
  'in-progress',
  'done',
  'canceled',
];

/** The priorities, from least to most urgent. */
export const TASK_PRIORITIES: readonly TaskPriority[] = [
  'low',
  'medium',
  'high',
];

const TITLES = [
  'Index the cloth patterns so search finds them by motif',
  'Fix the date picker closing when a month is clicked',
  'Write the guide to theming with CSS variables',
  'Add keyboard shortcuts to the command menu',
  'Compress the hero images on the marketing pages',
  'Retry failed webhook deliveries with backoff',
  'Document the data table filter options',
  'Show a toast when an export finishes',
  'Fix the sidebar flickering on first load',
  'Support right-to-left layouts in the calendar',
  'Translate the onboarding emails into French',
  'Let admins restore deleted projects for 30 days',
  'Explain rate limits in the API reference',
  'Fix the chart tooltip overflowing on mobile',
  'Add CSV import for customer lists',
  'Cache the pricing page at the edge',
  'Describe the release process in the handbook',
  'Fix focus being lost after closing a dialog',
  'Add two-factor sign-in with an authenticator app',
  'Measure the dashboard load time in production',
  'Write migration notes for the new icons',
  'Fix totals rounding in the invoice summary',
  'Let users pin reports to the sidebar',
  'Split the settings page into tabs',
  'List the supported browsers in the docs',
  'Fix the password strength meter in dark mode',
  'Add a weekly digest of team activity',
  'Remove the unused analytics script',
  'Document the accessibility testing setup',
  'Fix pagination resetting after a search',
] as const;

/**
 * The mock tasks: 30 of them, with statuses and priorities spread out by
 * fixed steps so every filter has something to show, and labels that
 * follow each title's verb.
 */
export const TASKS: readonly Task[] = TITLES.map((title, index) => ({
  id: `TASK-${8700 + ((index * 389) % 1000)}`,
  title,
  status: TASK_STATUSES[(index * 3) % TASK_STATUSES.length] ?? 'todo',
  priority: TASK_PRIORITIES[(index * 2 + 1) % TASK_PRIORITIES.length] ?? 'low',
  label: /^(Fix|Remove)/.test(title)
    ? 'bug'
    : /^(Write|Document|Describe|Explain|List)/.test(title)
      ? 'documentation'
      : 'feature',
}));

/**
 * Loads the tasks. It resolves the mock tasks; swap the `resource()` for
 * `httpResource<Task[]>(() => '/api/tasks')` to load them from your API.
 * Call it in an injection context, such as a field initializer. Its
 * `value` is writable, so local edits show before a reload.
 *
 * @returns The tasks as a resource: `value()`, `isLoading()` and `error()`.
 */
export function tasksResource() {
  return resource<readonly Task[], unknown>({
    loader: async () => TASKS,
    defaultValue: [],
  });
}
