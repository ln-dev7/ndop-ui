import { Component } from '@angular/core';
import {
  NdTabs,
  NdTabsContent,
  NdTabsList,
  NdTabsTrigger,
} from '@ndop/primitives/tabs';

/** Tabs demo (`/primitives/tabs`): account settings in three tabs. */
@Component({
  selector: 'harness-tabs-demo',
  imports: [NdTabs, NdTabsList, NdTabsTrigger, NdTabsContent],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Tabs</h1>
      <div ndTabs defaultValue="account" class="grid gap-2">
        <div ndTabsList aria-label="Settings" class="flex gap-1">
          <button ndTabsTrigger value="account" [class]="tab">Account</button>
          <button ndTabsTrigger value="billing" disabled [class]="tab">
            Billing
          </button>
          <button ndTabsTrigger value="password" [class]="tab">Password</button>
          <button ndTabsTrigger value="team" [class]="tab">Team</button>
        </div>
        <div ndTabsContent value="account">
          <label>Name <input class="rounded-md border px-2" /></label>
        </div>
        <div ndTabsContent value="billing">Billing details.</div>
        <div ndTabsContent value="password">Change your password.</div>
        <div ndTabsContent value="team">Invite your team.</div>
      </div>
      <div
        ndTabs
        defaultValue="general"
        orientation="vertical"
        activationMode="manual"
        class="flex gap-2"
      >
        <div ndTabsList aria-label="Sections" class="grid gap-1">
          <button ndTabsTrigger value="general" [class]="tab">General</button>
          <button ndTabsTrigger value="privacy" [class]="tab">Privacy</button>
        </div>
        <div ndTabsContent value="general">General settings.</div>
        <div ndTabsContent value="privacy">Privacy settings.</div>
      </div>
    </main>
  `,
})
export default class TabsDemo {
  protected readonly tab =
    'rounded-md border px-3 py-1 aria-selected:bg-black aria-selected:text-white';
}
