import { Component } from '@angular/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs/tabs';
import { landing } from 'virtual:ndop/landing';
import { KeyboardTable } from '../components/keyboard-table';

/**
 * The landing page's keyboard demo (ADR-0026, section 4): live Tabs beside
 * their keyboard table, from Tabs' `spec.md`, whose "Try the keyboard"
 * mode marks the row of each key the reader presses on the tabs.
 */
@Component({
  selector: 'docs-keyboard-demo',
  imports: [Tabs, TabsContent, TabsList, TabsTrigger, KeyboardTable],
  host: {
    class:
      'grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12',
  },
  template: `
    <div class="rounded-2xl border bg-background p-5 sm:p-6">
      <div ndTabs defaultValue="overview" class="gap-4">
        <div ndTabsList aria-label="Project">
          @for (tab of tabs; track tab.value) {
            <button ndTabsTrigger [value]="tab.value">{{ tab.title }}</button>
          }
        </div>
        @for (tab of tabs; track tab.value) {
          <div
            ndTabsContent
            [value]="tab.value"
            class="min-h-28 rounded-xl border border-dashed p-4"
          >
            <h3 class="text-sm font-medium">{{ tab.title }}</h3>
            <p class="mt-1 text-sm text-muted-foreground">{{ tab.text }}</p>
          </div>
        }
      </div>
      <p class="mt-4 text-sm text-muted-foreground">
        Focus a tab, then use the arrow keys, Home and End.
      </p>
    </div>
    <docs-keyboard-table
      [rows]="rows"
      tryHint="Press keys on the tabs, and watch which rule applies."
    />
  `,
})
export class KeyboardDemo {
  protected readonly rows = landing.keyboard;

  protected readonly tabs = [
    {
      value: 'overview',
      title: 'Overview',
      text: 'The Kribi Foods rebrand: twelve screens, due Friday.',
    },
    {
      value: 'activity',
      title: 'Activity',
      text: 'Amara approved the new logo two hours ago.',
    },
    {
      value: 'settings',
      title: 'Settings',
      text: 'Visible to Product. Weekly digest on Mondays.',
    },
  ];
}
