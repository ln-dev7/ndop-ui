import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs/tabs';

/**
 * Account settings in two tabs, each a card with a form. The arrow keys
 * move between the tabs; Tab moves on into the shown panel.
 */
@Component({
  selector: 'example-tabs-demo',
  imports: [
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  ],
  template: `
    <div ndTabs defaultValue="account" class="w-sm max-w-full">
      <div ndTabsList aria-label="Settings">
        <button ndTabsTrigger value="account">Account</button>
        <button ndTabsTrigger value="password">Password</button>
      </div>
      <div ndTabsContent value="account">
        <div ndCard>
          <div ndCardHeader>
            <h2 ndCardTitle>Account</h2>
            <p ndCardDescription>
              Make changes to your account here. Click save when you're done.
            </p>
          </div>
          <div ndCardContent class="grid gap-6">
            <div class="grid gap-3">
              <label ndLabel for="tabs-demo-name">Name</label>
              <input ndInput id="tabs-demo-name" value="Pedro Duarte" />
            </div>
            <div class="grid gap-3">
              <label ndLabel for="tabs-demo-username">Username</label>
              <input ndInput id="tabs-demo-username" value="@peduarte" />
            </div>
          </div>
          <div ndCardFooter>
            <button ndButton>Save changes</button>
          </div>
        </div>
      </div>
      <div ndTabsContent value="password">
        <div ndCard>
          <div ndCardHeader>
            <h2 ndCardTitle>Password</h2>
            <p ndCardDescription>
              Change your password here. After saving, you'll be logged out.
            </p>
          </div>
          <div ndCardContent class="grid gap-6">
            <div class="grid gap-3">
              <label ndLabel for="tabs-demo-current">Current password</label>
              <input ndInput id="tabs-demo-current" type="password" />
            </div>
            <div class="grid gap-3">
              <label ndLabel for="tabs-demo-new">New password</label>
              <input ndInput id="tabs-demo-new" type="password" />
            </div>
          </div>
          <div ndCardFooter>
            <button ndButton>Save password</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TabsDemoExample {}
