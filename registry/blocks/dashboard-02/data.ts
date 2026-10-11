import { resource } from '@angular/core';

/** One of the stat cards on the Overview tab. */
export interface AnalyticsStat {
  /** A unique id. */
  readonly id: string;
  /** What the number counts. */
  readonly label: string;
  /** The number, formatted for display. */
  readonly value: string;
  /** The change since last month, formatted for display. */
  readonly change: string;
}

/** A month's revenue, by channel, in US dollars. */
export interface AnalyticsMonth {
  /** The month's name. */
  readonly month: string;
  /** Revenue from the online store. */
  readonly online: number;
  /** Revenue from shops. */
  readonly inStore: number;
  /** How many orders were placed. */
  readonly orders: number;
  /** The share of visits that ended in an order, in percent. */
  readonly conversion: number;
}

/** A sale in the Recent sales list. */
export interface AnalyticsSale {
  /** A unique id. */
  readonly id: string;
  /** The buyer's name. */
  readonly name: string;
  /** The buyer's email address. */
  readonly email: string;
  /** The sale's total, in US dollars. */
  readonly amount: number;
}

/** What a notification is about, which picks its icon. */
export type AnalyticsNotificationKind = 'order' | 'alert' | 'team' | 'report';

/** A notification on the Notifications tab. */
export interface AnalyticsNotification {
  /** A unique id. */
  readonly id: string;
  /** What it is about. */
  readonly kind: AnalyticsNotificationKind;
  /** Its headline. */
  readonly title: string;
  /** More detail. */
  readonly body: string;
  /** When it arrived, for display. */
  readonly time: string;
  /** Whether it hasn't been read yet. */
  readonly unread: boolean;
}

/** Everything the analytics dashboard shows. */
export interface AnalyticsData {
  /** The stat cards, in order. */
  readonly stats: readonly AnalyticsStat[];
  /** Revenue for the last 6 months, oldest first. */
  readonly months: readonly AnalyticsMonth[];
  /** The latest sales, newest first. */
  readonly sales: readonly AnalyticsSale[];
  /** Notifications, newest first. */
  readonly notifications: readonly AnalyticsNotification[];
}

/** The mock data the analytics dashboard loads. */
export const ANALYTICS_DATA: AnalyticsData = {
  stats: [
    {
      id: 'revenue',
      label: 'Total revenue',
      value: '$45,231.89',
      change: '+20.1% from last month',
    },
    {
      id: 'subscriptions',
      label: 'Subscriptions',
      value: '+2,350',
      change: '+180.1% from last month',
    },
    {
      id: 'sales',
      label: 'Sales',
      value: '+12,234',
      change: '+19% from last month',
    },
    {
      id: 'active',
      label: 'Active now',
      value: '+573',
      change: '+201 since last hour',
    },
  ],
  months: [
    {
      month: 'May',
      online: 4200,
      inStore: 2400,
      orders: 512,
      conversion: 2.8,
    },
    {
      month: 'June',
      online: 3800,
      inStore: 2900,
      orders: 488,
      conversion: 2.6,
    },
    {
      month: 'July',
      online: 5100,
      inStore: 3100,
      orders: 634,
      conversion: 3.1,
    },
    {
      month: 'August',
      online: 4700,
      inStore: 2600,
      orders: 590,
      conversion: 2.9,
    },
    {
      month: 'September',
      online: 5900,
      inStore: 3400,
      orders: 712,
      conversion: 3.4,
    },
    {
      month: 'October',
      online: 6400,
      inStore: 3700,
      orders: 768,
      conversion: 3.6,
    },
  ],
  sales: [
    {
      id: 's1',
      name: 'Olivia Martin',
      email: 'olivia.martin@example.com',
      amount: 1999,
    },
    {
      id: 's2',
      name: 'Jackson Lee',
      email: 'jackson.lee@example.com',
      amount: 39,
    },
    {
      id: 's3',
      name: 'Isabella Nguyen',
      email: 'isabella.nguyen@example.com',
      amount: 299,
    },
    {
      id: 's4',
      name: 'William Kim',
      email: 'will@example.com',
      amount: 99,
    },
    {
      id: 's5',
      name: 'Sofia Davis',
      email: 'sofia.davis@example.com',
      amount: 39,
    },
  ],
  notifications: [
    {
      id: 'n1',
      kind: 'order',
      title: 'New order #3210',
      body: 'Olivia Martin ordered 3 items for $1,999.00.',
      time: '5 minutes ago',
      unread: true,
    },
    {
      id: 'n2',
      kind: 'alert',
      title: 'Low stock',
      body: 'Indigo throw, large, has 4 left.',
      time: '1 hour ago',
      unread: true,
    },
    {
      id: 'n3',
      kind: 'team',
      title: 'Jackson Lee joined the team',
      body: 'He can now see orders and reports.',
      time: 'Yesterday',
      unread: false,
    },
    {
      id: 'n4',
      kind: 'report',
      title: 'September report is ready',
      body: 'Revenue grew 25% on August.',
      time: 'October 1',
      unread: false,
    },
  ],
};

/**
 * Loads the analytics dashboard's data. It resolves the mock data; swap
 * the `resource()` for `httpResource<AnalyticsData>(() => '/api/analytics')`
 * to load it from your API. Call it in an injection context, such as a
 * field initializer.
 *
 * @returns The data as a resource: `value()`, `isLoading()` and `error()`.
 */
export function analyticsResource() {
  return resource({ loader: async () => ANALYTICS_DATA });
}
