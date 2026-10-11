import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Sidebar,
  SidebarContainer,
  SidebarContent,
  SidebarFooter,
  SidebarGap,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInner,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/ui/sidebar/sidebar';

/**
 * An app shell: a sidebar of grouped links that collapses to its icons
 * with the trigger, the rail or Ctrl+B (⌘B), and opens as a dialog on
 * small screens. In an app, drop the classes that keep it in this box,
 * and put `ndSidebarInset` on the page's `main`.
 */
@Component({
  selector: 'example-sidebar-demo',
  imports: [
    NdIcon,
    Sidebar,
    SidebarContainer,
    SidebarContent,
    SidebarFooter,
    SidebarGap,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInner,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
  ],
  template: `
    <div
      ndSidebarProvider
      [shortcut]="null"
      class="relative min-h-[420px] w-[640px] max-w-full overflow-hidden rounded-lg border"
    >
      <div ndSidebar collapsible="icon">
        <div ndSidebarGap></div>
        <div ndSidebarContainer aria-label="Main" class="absolute h-full">
          <div ndSidebarInner>
            <div ndSidebarHeader>
              <span class="px-2 text-sm font-semibold">Acme Inc</span>
            </div>
            <div ndSidebarContent>
              <nav ndSidebarGroup aria-labelledby="sidebar-demo-app">
                <div ndSidebarGroupLabel id="sidebar-demo-app">Application</div>
                <div ndSidebarGroupContent>
                  <ul ndSidebarMenu>
                    @for (link of links; track link.href) {
                      <li ndSidebarMenuItem>
                        <a
                          ndSidebarMenuButton
                          [href]="link.href"
                          [active]="link.href === '#home'"
                        >
                          <svg [ndIcon]="link.icon"></svg>
                          <span>{{ link.label }}</span>
                        </a>
                      </li>
                    }
                  </ul>
                </div>
              </nav>
            </div>
            <div ndSidebarFooter>
              <a ndSidebarMenuButton href="#settings">
                <svg ndIcon="settings"></svg>
                <span>Settings</span>
              </a>
            </div>
          </div>
          <button ndSidebarRail title="Toggle sidebar"></button>
        </div>
      </div>
      <div ndSidebarInset>
        <header class="flex h-12 items-center gap-2 border-b px-4">
          <button ndSidebarTrigger>
            <svg ndIcon="panel-left"></svg>
            <span class="sr-only">Toggle sidebar</span>
          </button>
          <span class="text-sm font-medium">Home</span>
        </header>
        <div class="p-4 text-sm text-muted-foreground">Your workspace.</div>
      </div>
    </div>
  `,
})
export class SidebarDemoExample {
  protected readonly links = [
    { href: '#home', label: 'Home', icon: 'house' },
    { href: '#inbox', label: 'Inbox', icon: 'inbox' },
    { href: '#calendar', label: 'Calendar', icon: 'calendar' },
    { href: '#search', label: 'Search', icon: 'search' },
  ];
}
