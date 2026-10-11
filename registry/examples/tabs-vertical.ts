import { Component } from '@angular/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs/tabs';

/**
 * Tabs stacked beside their panels. With manual activation, the arrow
 * keys only move focus; Enter or Space shows the focused tab's panel.
 */
@Component({
  selector: 'example-tabs-vertical',
  imports: [Tabs, TabsContent, TabsList, TabsTrigger],
  template: `
    <div
      ndTabs
      defaultValue="general"
      orientation="vertical"
      activationMode="manual"
      class="w-md max-w-full"
    >
      <div ndTabsList aria-label="Preferences">
        <button ndTabsTrigger value="general">General</button>
        <button ndTabsTrigger value="notifications">Notifications</button>
        <button ndTabsTrigger value="privacy">Privacy</button>
      </div>
      <div ndTabsContent value="general" class="text-sm">
        Language, time zone and start page.
      </div>
      <div ndTabsContent value="notifications" class="text-sm">
        Email and push notifications.
      </div>
      <div ndTabsContent value="privacy" class="text-sm">
        Who can see your profile and activity.
      </div>
    </div>
  `,
})
export class TabsVerticalExample {}
