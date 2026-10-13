import { Component, computed, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/accordion/accordion';
import {
  Calendar,
  CalendarCaption,
  CalendarCell,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarMonth,
  CalendarMonths,
  CalendarNav,
  CalendarNext,
  CalendarPrevious,
  CalendarWeek,
  CalendarWeekday,
  CalendarWeekdays,
  type DateRange,
} from '@/ui/calendar/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/ui/form-field/form-field';
import { Switch, SwitchThumb } from '@/ui/switch/switch';

/** A day in milliseconds, for counting the days of a range. */
const DAY = 24 * 60 * 60 * 1000;

/**
 * The landing showcase's third column (ADR-0026, amendment 1): a date
 * range for the team's offsite, notification settings and billing
 * questions. On phones the questions are left out.
 */
@Component({
  selector: 'docs-showcase-column-3',
  imports: [
    NdIcon,
    Accordion,
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionTrigger,
    Calendar,
    CalendarCaption,
    CalendarCell,
    CalendarDay,
    CalendarGrid,
    CalendarHeading,
    CalendarMonth,
    CalendarMonths,
    CalendarNav,
    CalendarNext,
    CalendarPrevious,
    CalendarWeek,
    CalendarWeekday,
    CalendarWeekdays,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    Switch,
    SwitchThumb,
  ],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div ndCard class="gap-5 py-5">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Team offsite</h3>
        <p ndCardDescription>Kribi, with the whole studio.</p>
      </div>
      <div ndCardContent class="px-5">
        <div
          ndCalendar
          #calendar="ndCalendar"
          mode="range"
          class="w-full p-0"
          [defaultMonth]="month"
          [(range)]="range"
        >
          <div ndCalendarMonths>
            <div ndCalendarNav>
              <button ndCalendarPrevious aria-label="Previous month">
                <svg ndIcon="chevron-left"></svg>
              </button>
              <button ndCalendarNext aria-label="Next month">
                <svg ndIcon="chevron-right"></svg>
              </button>
            </div>
            @for (month of calendar.months(); track month.key) {
              <div ndCalendarMonth [month]="month">
                <div ndCalendarCaption>
                  <div ndCalendarHeading>{{ month.label }}</div>
                </div>
                <table ndCalendarGrid>
                  <thead>
                    <tr ndCalendarWeekdays>
                      @for (
                        weekday of calendar.weekdays();
                        track weekday.long
                      ) {
                        <th ndCalendarWeekday [weekday]="weekday">
                          {{ weekday.short }}
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (week of month.weeks; track week.key) {
                      <tr ndCalendarWeek>
                        @for (day of week.days; track day.key) {
                          <td ndCalendarCell [day]="day">
                            <button ndCalendarDay [day]="day">
                              {{ day.label }}
                            </button>
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>
      <div
        ndCardFooter
        class="justify-between gap-3 border-t px-5 pt-4 text-sm [.border-t]:pt-4"
      >
        <span class="text-muted-foreground">Selected</span>
        <span class="font-medium tabular-nums">{{ summary() }}</span>
      </div>
    </div>

    <div ndCard class="gap-5 py-5">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Notifications</h3>
        <p ndCardDescription>Choose what reaches your inbox.</p>
      </div>
      <div ndCardContent class="px-5">
        <div ndFieldGroup class="gap-5">
          @for (setting of settings; track setting.id) {
            <div ndField orientation="horizontal">
              <div ndFieldContent>
                <label ndFieldLabel [for]="'sc-notify-' + setting.id">{{
                  setting.label
                }}</label>
                <p ndFieldDescription>{{ setting.description }}</p>
              </div>
              <button
                ndSwitch
                [id]="'sc-notify-' + setting.id"
                [defaultChecked]="setting.on"
              >
                <span ndSwitchThumb></span>
              </button>
            </div>
          }
        </div>
      </div>
    </div>

    <div ndCard class="hidden flex-1 gap-2 py-5 md:flex">
      <div ndCardHeader class="px-5">
        <h3 ndCardTitle>Billing questions</h3>
      </div>
      <div ndCardContent class="px-5">
        <div ndAccordion collapsible defaultValue="charge">
          @for (question of questions; track question.value) {
            <div ndAccordionItem [value]="question.value">
              <h4 ndAccordionHeader>
                <button ndAccordionTrigger>
                  {{ question.title }}
                  <svg ndIcon="chevron-down"></svg>
                </button>
              </h4>
              <div ndAccordionContent>{{ question.answer }}</div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ShowcaseColumn3 {
  /** The month the calendar opens on: October 2026. */
  protected readonly month = new Date(2026, 9, 1);

  protected readonly range = signal<DateRange>({
    from: new Date(2026, 9, 19),
    to: new Date(2026, 9, 23),
  });

  protected readonly summary = computed(() => {
    const { from, to } = this.range();
    if (!from) return 'No dates';
    const format = (date: Date) =>
      date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    if (!to) return format(from);
    const days = Math.round((to.getTime() - from.getTime()) / DAY) + 1;
    return `${format(from)} – ${format(to)} · ${days} days`;
  });

  protected readonly settings = [
    {
      id: 'mentions',
      label: 'Mentions',
      description: 'When someone mentions you in a comment.',
      on: true,
    },
    {
      id: 'digest',
      label: 'Weekly digest',
      description: 'A summary of your projects every Monday.',
      on: true,
    },
    {
      id: 'product',
      label: 'Product updates',
      description: 'New features, about once a month.',
      on: false,
    },
  ];

  protected readonly questions = [
    {
      value: 'charge',
      title: 'When am I charged?',
      answer: 'On the first of each month, for the seats you used.',
    },
    {
      value: 'momo',
      title: 'Can I pay with mobile money?',
      answer: 'Yes: MTN MoMo and Orange Money, in XAF or XOF.',
    },
    {
      value: 'invoice',
      title: 'Where are my invoices?',
      answer: 'Each payment emails a PDF to your billing contact.',
    },
  ];
}
