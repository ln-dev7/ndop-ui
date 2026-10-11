import { resource } from '@angular/core';

/** One of the stat cards at the top of the dashboard. */
export interface DashboardStat {
  /** A unique id, also used for element ids. */
  readonly id: string;
  /** What the number counts. */
  readonly label: string;
  /** The number, formatted for display. */
  readonly value: string;
  /** The change since the last period, in percent; negative when down. */
  readonly change: number;
  /** A sentence on the trend. */
  readonly trend: string;
  /** What the number covers. */
  readonly note: string;
}

/** A day's visitors, by device. */
export interface DashboardVisitors {
  /** The day, as an ISO date (`2026-10-11`). */
  readonly date: string;
  /** Visitors on desktop. */
  readonly desktop: number;
  /** Visitors on mobile. */
  readonly mobile: number;
}

/** Where an order is in its life. */
export type DashboardOrderStatus = 'paid' | 'pending' | 'refunded';

/** An order in the recent orders table. */
export interface DashboardOrder {
  /** The order's number. */
  readonly id: string;
  /** Who placed it. */
  readonly customer: string;
  /** Their email address. */
  readonly email: string;
  /** Where it is in its life. */
  readonly status: DashboardOrderStatus;
  /** When it was placed, as an ISO date. */
  readonly date: string;
  /** Its total, in US dollars. */
  readonly amount: number;
}

/** Everything the dashboard shows. */
export interface DashboardData {
  /** The stat cards, in order. */
  readonly stats: readonly DashboardStat[];
  /** Visitors per day for the last 90 days, oldest first. */
  readonly visitors: readonly DashboardVisitors[];
  /** The latest orders, newest first. */
  readonly orders: readonly DashboardOrder[];
}

/** The last day of the mock data, fixed so server and browser agree. */
const LAST_DAY = Date.UTC(2026, 9, 11);
const DAY = 24 * 60 * 60 * 1000;

/** Mock visitors: smooth waves with a slow rise, the same on every run. */
const VISITORS: readonly DashboardVisitors[] = Array.from(
  { length: 90 },
  (_, index) => ({
    date: new Date(LAST_DAY - (89 - index) * DAY).toISOString().slice(0, 10),
    desktop: Math.round(
      220 + 90 * Math.sin(index / 6) + 40 * Math.sin(index / 1.7) + index * 1.5,
    ),
    mobile: Math.round(
      160 + 70 * Math.cos(index / 8) + 30 * Math.sin(index / 2.3) + index,
    ),
  }),
);

/** The mock data the dashboard loads. */
export const DASHBOARD_DATA: DashboardData = {
  stats: [
    {
      id: 'revenue',
      label: 'Total revenue',
      value: '$1,250.00',
      change: 12.5,
      trend: 'Trending up this month',
      note: 'Revenue for the last 3 months',
    },
    {
      id: 'customers',
      label: 'New customers',
      value: '1,234',
      change: -20,
      trend: 'Down 20% this period',
      note: 'Acquisition needs attention',
    },
    {
      id: 'accounts',
      label: 'Active accounts',
      value: '45,678',
      change: 12.5,
      trend: 'Strong user retention',
      note: 'Engagement exceeds targets',
    },
    {
      id: 'growth',
      label: 'Growth rate',
      value: '4.5%',
      change: 4.5,
      trend: 'Steady performance increase',
      note: 'Meets growth projections',
    },
  ],
  visitors: VISITORS,
  orders: [
    {
      id: 'ORD-3210',
      customer: 'Amara Nkeng',
      email: 'amara@example.com',
      status: 'paid',
      date: '2026-10-11',
      amount: 249,
    },
    {
      id: 'ORD-3209',
      customer: 'Lucas Martin',
      email: 'lucas@example.com',
      status: 'pending',
      date: '2026-10-10',
      amount: 89.5,
    },
    {
      id: 'ORD-3208',
      customer: 'Yuki Tanaka',
      email: 'yuki@example.com',
      status: 'paid',
      date: '2026-10-10',
      amount: 1240,
    },
    {
      id: 'ORD-3207',
      customer: 'Fatima Bello',
      email: 'fatima@example.com',
      status: 'refunded',
      date: '2026-10-09',
      amount: 39,
    },
    {
      id: 'ORD-3206',
      customer: 'Noah Schmidt',
      email: 'noah@example.com',
      status: 'paid',
      date: '2026-10-08',
      amount: 312.75,
    },
    {
      id: 'ORD-3205',
      customer: 'Sofia Rossi',
      email: 'sofia@example.com',
      status: 'pending',
      date: '2026-10-08',
      amount: 64,
    },
  ],
};

/**
 * Loads the dashboard's data. It resolves the mock data; swap the
 * `resource()` for `httpResource<DashboardData>(() => '/api/dashboard')`
 * to load it from your API. Call it in an injection context, such as a
 * field initializer.
 *
 * @returns The data as a resource: `value()`, `isLoading()` and `error()`.
 */
export function dashboardResource() {
  return resource({ loader: async () => DASHBOARD_DATA });
}
