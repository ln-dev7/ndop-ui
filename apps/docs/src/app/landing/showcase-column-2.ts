import { Component, computed, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert/alert';
import { Avatar, AvatarFallback } from '@/ui/avatar/avatar';
import { Badge } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import {
  Slider,
  SliderRange,
  SliderThumb,
  SliderTrack,
} from '@/ui/slider/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';
import { DemoChart, type DemoChartPoint } from './demo-chart';

/** The days of the charts. */
const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Builds a week of chart points.
 *
 * @param values - One value per day, Monday first.
 * @returns The points.
 */
function week(values: number[]): DemoChartPoint[] {
  return DAYS.map((day, index) => ({ day, value: values[index] ?? 0 }));
}

/**
 * The landing showcase's second column (ADR-0026, amendment 1): a week of
 * visitors and sign-ups in tabs, the team's members, project labels,
 * board defaults and a sent invoice's notice. On phones only the week and
 * the team show.
 */
@Component({
  selector: 'docs-showcase-column-2',
  imports: [
    NdIcon,
    Alert,
    AlertDescription,
    AlertTitle,
    Avatar,
    AvatarFallback,
    Badge,
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    DemoChart,
    Slider,
    SliderRange,
    SliderThumb,
    SliderTrack,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    ToggleGroup,
    ToggleGroupItem,
  ],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div ndCard class="gap-5 py-5">
      <div ndTabs defaultValue="visitors" class="gap-5">
        <div ndCardHeader class="px-5">
          <h3 ndCardTitle>This week</h3>
          <p ndCardDescription>All pages</p>
          <div ndCardAction>
            <div ndTabsList aria-label="Metric" class="h-8">
              <button ndTabsTrigger value="visitors" class="px-2.5 text-xs">
                Visitors
              </button>
              <button ndTabsTrigger value="signups" class="px-2.5 text-xs">
                Sign-ups
              </button>
            </div>
          </div>
        </div>
        @for (metric of metrics; track metric.value) {
          <div ndTabsContent [value]="metric.value" class="px-5">
            <div class="flex items-baseline gap-2">
              <p class="text-2xl font-semibold tracking-tight tabular-nums">
                {{ metric.total }}
              </p>
              <span ndBadge variant="secondary">{{ metric.change }}</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              Compared with last week
            </p>
            <docs-demo-chart
              class="mt-4"
              [id]="'sc-chart-' + metric.value"
              [label]="metric.label"
              [data]="metric.data"
            />
          </div>
        }
      </div>
    </div>

    <div ndCard class="gap-5 py-5">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Team members</h3>
        <p ndCardDescription>Four people in Product.</p>
        <div ndCardAction>
          <button ndButton size="sm" variant="outline">Invite</button>
        </div>
      </div>
      <div ndCardContent class="px-5">
        <ul class="grid gap-4">
          @for (member of members; track member.email) {
            <li class="flex items-center gap-3">
              <span ndAvatar>
                <span ndAvatarFallback>{{ member.initials }}</span>
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium leading-none">
                  {{ member.name }}
                </p>
                <p class="mt-1 truncate text-sm text-muted-foreground">
                  {{ member.email }}
                </p>
              </div>
              <span
                ndBadge
                [variant]="member.role === 'Owner' ? 'default' : 'outline'"
                >{{ member.role }}</span
              >
            </li>
          }
        </ul>
      </div>
    </div>

    <div ndCard class="hidden gap-5 py-5 md:flex">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Labels</h3>
        <p ndCardDescription>On the Kribi Foods rebrand.</p>
      </div>
      <div ndCardContent class="flex flex-wrap gap-2 px-5">
        <span ndBadge>Branding</span>
        <span ndBadge variant="secondary">Research</span>
        <span ndBadge variant="secondary">Packaging</span>
        <span ndBadge variant="outline">Client review</span>
        <span ndBadge variant="outline">Q4 2026</span>
        <span ndBadge variant="destructive">Due Friday</span>
      </div>
    </div>

    <div ndCard class="hidden flex-1 gap-5 py-5 md:flex">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Board defaults</h3>
        <p ndCardDescription>For new projects in Product.</p>
      </div>
      <div ndCardContent class="grid gap-6 px-5">
        <div class="grid gap-3">
          <span class="text-sm leading-none font-medium" id="sc-view-label"
            >Default view</span
          >
          <div
            ndToggleGroup
            variant="outline"
            size="sm"
            aria-labelledby="sc-view-label"
            class="w-full"
            [defaultValue]="['board']"
          >
            <button ndToggleGroupItem value="board" class="flex-1">
              Board
            </button>
            <button ndToggleGroupItem value="list" class="flex-1">List</button>
            <button ndToggleGroupItem value="timeline" class="flex-1">
              Timeline
            </button>
          </div>
        </div>
        <div class="grid gap-3">
          <div class="flex items-center justify-between gap-3">
            <span
              class="text-sm leading-none font-medium"
              id="sc-capacity-label"
              >Weekly capacity</span
            >
            <span class="text-sm text-muted-foreground tabular-nums"
              >{{ capacity() }} hours</span
            >
          </div>
          <div ndSlider [min]="8" [max]="40" [step]="4">
            <div ndSliderTrack><div ndSliderRange></div></div>
            <span
              ndSliderThumb
              aria-labelledby="sc-capacity-label"
              [valueText]="capacityText()"
              [(value)]="capacity"
            ></span>
          </div>
        </div>
      </div>
    </div>

    <div ndAlert role="none" class="hidden shadow-sm md:grid">
      <svg ndIcon="circle-check"></svg>
      <div ndAlertTitle>Invoice sent to Kribi Foods</div>
      <div ndAlertDescription>They'll get the PDF by email in a minute.</div>
    </div>
  `,
})
export class ShowcaseColumn2 {
  protected readonly metrics = [
    {
      value: 'visitors',
      label: 'Visitors',
      total: '12,480',
      change: '+18.2%',
      data: week([1420, 1980, 1710, 2140, 2480, 1260, 1490]),
    },
    {
      value: 'signups',
      label: 'Sign-ups',
      total: '1,284',
      change: '+9.4%',
      data: week([164, 212, 178, 236, 248, 102, 144]),
    },
  ];

  protected readonly members = [
    {
      name: 'Amara Nwosu',
      email: 'amara@sawa.studio',
      initials: 'AN',
      role: 'Owner',
    },
    {
      name: 'Kwame Mensah',
      email: 'kwame@sawa.studio',
      initials: 'KM',
      role: 'Admin',
    },
    {
      name: 'Sofia Rossi',
      email: 'sofia@sawa.studio',
      initials: 'SR',
      role: 'Member',
    },
    {
      name: 'Yuki Tanaka',
      email: 'yuki@sawa.studio',
      initials: 'YT',
      role: 'Member',
    },
  ];

  protected readonly capacity = signal(32);

  protected readonly capacityText = computed(
    () => `${this.capacity()} hours a week`,
  );
}
