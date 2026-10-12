import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Sidebar,
  SidebarContainer,
  SidebarContent,
  SidebarGap,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInner,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/ui/sidebar/sidebar';

/**
 * A floating sidebar that slides off-canvas, with an unread count and
 * nested links. Collapsed, it's inert, so its links leave the tab order.
 */
@Component({
  selector: 'example-sidebar-floating',
  imports: [
    NdIcon,
    Sidebar,
    SidebarContainer,
    SidebarContent,
    SidebarGap,
    SidebarGroup,
    SidebarGroupContent,
    SidebarInner,
    SidebarInset,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarTrigger,
  ],
  template: `
    <div
      ndSidebarProvider
      [shortcut]="null"
      class="relative min-h-[420px] w-[640px] max-w-full overflow-hidden rounded-lg border"
    >
      <div ndSidebar variant="floating">
        <div ndSidebarGap></div>
        <div ndSidebarContainer aria-label="Workspace" class="absolute h-full">
          <div ndSidebarInner>
            <div ndSidebarContent>
              <nav ndSidebarGroup aria-label="Workspace pages">
                <div ndSidebarGroupContent>
                  <ul ndSidebarMenu>
                    <li ndSidebarMenuItem>
                      <a ndSidebarMenuButton href="#inbox" active>
                        <svg ndIcon="inbox"></svg>
                        <span>Inbox</span>
                      </a>
                      <div ndSidebarMenuBadge>24</div>
                    </li>
                    <li ndSidebarMenuItem>
                      <a ndSidebarMenuButton href="#guides">
                        <svg ndIcon="folder-open"></svg>
                        <span>Guides</span>
                      </a>
                      <ul ndSidebarMenuSub>
                        <li ndSidebarMenuSubItem>
                          <a ndSidebarMenuSubButton href="#installation">
                            Installation
                          </a>
                        </li>
                        <li ndSidebarMenuSubItem>
                          <a ndSidebarMenuSubButton href="#theming">Theming</a>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>
      <div ndSidebarInset>
        <header class="flex h-12 items-center gap-2 px-4">
          <button ndSidebarTrigger>
            <svg ndIcon="panel-left"></svg>
            <span class="sr-only">Toggle sidebar</span>
          </button>
        </header>
        <div class="p-4 text-sm text-muted-foreground">Inbox</div>
      </div>
    </div>
  `,
})
export class SidebarFloatingExample {}
