import { Component } from '@angular/core';
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/ui/sidebar/sidebar';

/** A link in one of the sidebar's groups. */
interface NavLink {
  readonly href: string;
  readonly label: string;
  readonly icon: string;
}

/** A labelled group of sidebar links, rendered as its own `nav`. */
interface NavGroup {
  readonly id: string;
  readonly label: string;
  readonly links: readonly NavLink[];
}

/**
 * An app shell: a sidebar with the team, two groups of links (each its own
 * named `nav`) and the signed-in user, beside the page's `main` with a
 * header bar, a breadcrumb and placeholder content. The sidebar slides
 * off-canvas with its trigger or Ctrl+B (⌘B), and opens as a modal sheet
 * below the `md` breakpoint.
 */
@Component({
  selector: 'block-sidebar-01',
  imports: [
    Avatar,
    AvatarFallback,
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
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
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
  ],
  template: `
    <div ndSidebarProvider>
      <div ndSidebar>
        <div ndSidebarGap></div>
        <div ndSidebarContainer aria-label="Sidebar">
          <div ndSidebarInner>
            <div ndSidebarHeader>
              <a ndSidebarMenuButton size="lg" href="/">
                <span
                  class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
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
              @for (group of groups; track group.id) {
                <nav ndSidebarGroup [attr.aria-labelledby]="group.id">
                  <div ndSidebarGroupLabel [id]="group.id">
                    {{ group.label }}
                  </div>
                  <div ndSidebarGroupContent>
                    <ul ndSidebarMenu>
                      @for (link of group.links; track link.href) {
                        <li ndSidebarMenuItem>
                          <a
                            ndSidebarMenuButton
                            [href]="link.href"
                            [active]="link.href === current"
                          >
                            <svg [ndIcon]="link.icon"></svg>
                            <span>{{ link.label }}</span>
                          </a>
                        </li>
                      }
                    </ul>
                  </div>
                </nav>
              }
            </div>
            <div ndSidebarFooter>
              <div class="flex items-center gap-2 p-2">
                <span ndAvatar class="rounded-lg">
                  <span ndAvatarFallback class="rounded-lg">AN</span>
                </span>
                <span class="grid flex-1 text-start text-sm leading-tight">
                  <span class="truncate font-medium">Amina Njoya</span>
                  <span class="truncate text-xs text-sidebar-foreground/70">
                    amina&#64;example.com
                  </span>
                </span>
              </div>
            </div>
          </div>
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
  `,
})
export class Sidebar01Block {
  /** The link to the page this shell shows, marked as current. */
  protected readonly current = '/dashboard';

  protected readonly groups: readonly NavGroup[] = [
    {
      id: 'sidebar-01-platform',
      label: 'Platform',
      links: [
        { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
        { href: '/projects', label: 'Projects', icon: 'folder' },
        { href: '/team', label: 'Team', icon: 'users' },
        { href: '/inbox', label: 'Inbox', icon: 'inbox' },
      ],
    },
    {
      id: 'sidebar-01-resources',
      label: 'Resources',
      links: [
        { href: '/docs', label: 'Documentation', icon: 'file-text' },
        { href: '/support', label: 'Support', icon: 'life-buoy' },
        { href: '/settings', label: 'Settings', icon: 'settings' },
      ],
    },
  ];

  protected readonly tiles = [1, 2, 3];
}
