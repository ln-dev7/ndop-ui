import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Avatar, AvatarFallback } from '@/ui/avatar/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/ui/breadcrumb/breadcrumb';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/ui/collapsible/collapsible';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/ui/dropdown-menu/dropdown-menu';
import { Separator } from '@/ui/separator/separator';
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/ui/sidebar/sidebar';
import { NdMenuGroup as DropdownMenuGroup } from '@ndop/primitives/menu';
import { NdDropdownMenuTrigger as DropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';

/** A link in one of the sidebar's groups. */
interface NavLink {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

/**
 * An app shell whose sidebar collapses to its icons with the trigger, the
 * rail or Ctrl+B (⌘B), and opens as a modal sheet below the `md`
 * breakpoint. Its menu has an unread count, a collapsible list of
 * projects, and an account menu on the user in its footer.
 */
@Component({
  selector: 'block-sidebar-02',
  imports: [
    Avatar,
    AvatarFallback,
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    NdIcon,
    Separator,
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
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
  ],
  template: `
    <div ndSidebarProvider>
      <div ndSidebar collapsible="icon">
        <div ndSidebarGap></div>
        <div ndSidebarContainer aria-label="Sidebar">
          <div ndSidebarInner>
            <div ndSidebarHeader>
              <a ndSidebarMenuButton size="lg" href="/">
                <span
                  class="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
                >
                  <svg
                    viewBox="0 0 16 16"
                    class="size-4"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 1 15 8 8 15 1 8Z" opacity="0.5" />
                    <path d="M8 4.5 11.5 8 8 11.5 4.5 8Z" />
                  </svg>
                </span>
                <span class="grid flex-1 text-start leading-tight">
                  <span class="truncate font-semibold">Ndop Studio</span>
                  <span class="truncate text-xs">Enterprise</span>
                </span>
              </a>
            </div>
            <div ndSidebarContent>
              <nav ndSidebarGroup aria-labelledby="sidebar-02-platform">
                <div ndSidebarGroupLabel id="sidebar-02-platform">Platform</div>
                <div ndSidebarGroupContent>
                  <ul ndSidebarMenu>
                    <li ndSidebarMenuItem>
                      <a ndSidebarMenuButton href="/dashboard" active>
                        <svg ndIcon="layout-dashboard"></svg>
                        <span>Dashboard</span>
                      </a>
                    </li>
                    <li ndSidebarMenuItem>
                      <a ndSidebarMenuButton href="/inbox">
                        <svg ndIcon="inbox"></svg>
                        <span>Inbox</span>
                      </a>
                      <div ndSidebarMenuBadge>
                        12<span class="sr-only"> unread</span>
                      </div>
                    </li>
                    <li ndSidebarMenuItem ndCollapsible defaultOpen>
                      <button
                        type="button"
                        ndSidebarMenuButton
                        ndCollapsibleTrigger
                      >
                        <svg ndIcon="folder"></svg>
                        <span>Projects</span>
                        <svg
                          ndIcon="chevron-down"
                          class="ms-auto transition-transform duration-200 [[data-state=open]>&]:rotate-180"
                        ></svg>
                      </button>
                      <div ndCollapsibleContent>
                        <ul ndSidebarMenuSub>
                          @for (project of projects; track project.href) {
                            <li ndSidebarMenuSubItem>
                              <a ndSidebarMenuSubButton [href]="project.href">
                                <span>{{ project.label }}</span>
                              </a>
                            </li>
                          }
                        </ul>
                      </div>
                    </li>
                    <li ndSidebarMenuItem>
                      <a ndSidebarMenuButton href="/team">
                        <svg ndIcon="users"></svg>
                        <span>Team</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </nav>
              <nav ndSidebarGroup aria-labelledby="sidebar-02-resources">
                <div ndSidebarGroupLabel id="sidebar-02-resources">
                  Resources
                </div>
                <div ndSidebarGroupContent>
                  <ul ndSidebarMenu>
                    @for (link of resources; track link.href) {
                      <li ndSidebarMenuItem>
                        <a ndSidebarMenuButton [href]="link.href">
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
              <button
                type="button"
                ndSidebarMenuButton
                size="lg"
                class="aria-expanded:bg-sidebar-accent"
                [ndDropdownMenuTrigger]="account"
                side="top"
                align="start"
              >
                <span ndAvatar class="rounded-lg">
                  <span ndAvatarFallback class="rounded-lg">AN</span>
                </span>
                <span class="grid flex-1 text-start text-sm leading-tight">
                  <span class="truncate font-medium">Amina Njoya</span>
                  <span class="truncate text-xs">amina&#64;example.com</span>
                </span>
                <svg ndIcon="chevrons-up-down" class="ms-auto size-4"></svg>
                <span class="sr-only">, account menu</span>
              </button>
            </div>
          </div>
          <button ndSidebarRail title="Toggle sidebar"></button>
        </div>
      </div>
      <main ndSidebarInset>
        <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <button ndSidebarTrigger class="-ms-1">
            <svg ndIcon="panel-left"></svg>
            <span class="sr-only">Toggle sidebar</span>
          </button>
          <div
            ndSeparator
            orientation="vertical"
            decorative
            class="me-2 data-[orientation=vertical]:h-4"
          ></div>
          <nav ndBreadcrumb>
            <ol ndBreadcrumbList>
              <li ndBreadcrumbItem class="hidden md:inline-flex">
                <a ndBreadcrumbLink href="/">Platform</a>
              </li>
              <li ndBreadcrumbSeparator class="hidden md:list-item">
                <svg ndIcon="chevron-right"></svg>
              </li>
              <li ndBreadcrumbItem>
                <span ndBreadcrumbPage>Dashboard</span>
              </li>
            </ol>
          </nav>
        </header>
        <div class="flex flex-1 flex-col gap-4 p-4">
          <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p class="text-sm text-muted-foreground" aria-live="polite">
            {{ chosen() }}
          </p>
          <div class="grid auto-rows-min gap-4 md:grid-cols-3">
            @for (tile of tiles; track tile) {
              <div
                class="aspect-video rounded-xl bg-muted/50"
                aria-hidden="true"
              ></div>
            }
          </div>
          <div
            class="min-h-[50vh] flex-1 rounded-xl bg-muted/50 md:min-h-min"
            aria-hidden="true"
          ></div>
        </div>
      </main>
    </div>
    <ng-template #account>
      <div ndDropdownMenuContent class="w-56">
        <div ndMenuGroup aria-labelledby="sidebar-02-account">
          <div ndDropdownMenuLabel id="sidebar-02-account">Amina Njoya</div>
          <div ndDropdownMenuItem (triggered)="choose('Account')">
            <svg ndIcon="user"></svg>
            Account
          </div>
          <div ndDropdownMenuItem (triggered)="choose('Billing')">
            <svg ndIcon="credit-card"></svg>
            Billing
          </div>
        </div>
        <div ndDropdownMenuSeparator></div>
        <div ndDropdownMenuItem (triggered)="choose('Log out')">
          <svg ndIcon="log-out"></svg>
          Log out
        </div>
      </div>
    </ng-template>
  `,
})
export class Sidebar02Block {
  /** What the account menu last did, announced politely. */
  protected readonly chosen = signal('');

  protected readonly projects: readonly Omit<NavLink, 'icon'>[] = [
    { href: '/projects/website', label: 'Website redesign' },
    { href: '/projects/mobile', label: 'Mobile app' },
    { href: '/projects/archive', label: 'Archive' },
  ];

  protected readonly resources: readonly NavLink[] = [
    { href: '/docs', label: 'Documentation', icon: 'file-text' },
    { href: '/support', label: 'Support', icon: 'life-buoy' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];

  protected readonly tiles = [1, 2, 3];

  /**
   * Reports the account menu's action, where an app would route or sign
   * out.
   *
   * @param action - The item's name.
   */
  protected choose(action: string): void {
    this.chosen.set(`Chose ${action}.`);
  }
}
