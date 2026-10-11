import { Component } from '@angular/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs/tabs';

/** Tabs underlined instead of raised, with the line variant. */
@Component({
  selector: 'example-tabs-line',
  imports: [Tabs, TabsContent, TabsList, TabsTrigger],
  template: `
    <div ndTabs defaultValue="overview" class="w-sm max-w-full">
      <div ndTabsList variant="line" aria-label="Project">
        <button ndTabsTrigger value="overview">Overview</button>
        <button ndTabsTrigger value="analytics">Analytics</button>
        <button ndTabsTrigger value="reports" disabled>Reports</button>
      </div>
      <div ndTabsContent value="overview" class="text-sm text-muted-foreground">
        Your project at a glance.
      </div>
      <div
        ndTabsContent
        value="analytics"
        class="text-sm text-muted-foreground"
      >
        Visitors and conversions over time.
      </div>
      <div ndTabsContent value="reports" class="text-sm text-muted-foreground">
        Reports are on the paid plan.
      </div>
    </div>
  `,
})
export class TabsLineExample {}
