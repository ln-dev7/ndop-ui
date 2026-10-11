import { Component } from '@angular/core';
import {
  NdSidebar,
  NdSidebarContainer,
  NdSidebarGap,
  NdSidebarMenuButton,
  NdSidebarProvider,
  NdSidebarRail,
  NdSidebarTrigger,
} from '@ndop/primitives/sidebar';

/**
 * Sidebar demo (`/primitives/sidebar`): an off-canvas sidebar with a
 * menu, which is a modal dialog on narrow viewports.
 */
@Component({
  selector: 'harness-sidebar-demo',
  imports: [
    NdSidebarProvider,
    NdSidebar,
    NdSidebarGap,
    NdSidebarContainer,
    NdSidebarTrigger,
    NdSidebarRail,
    NdSidebarMenuButton,
  ],
  template: `
    <div ndSidebarProvider class="flex min-h-svh">
      <div ndSidebar class="group peer">
        <div
          ndSidebarGap
          class="w-64 transition-[width] group-data-[collapsible=offcanvas]:w-0 max-md:hidden"
        ></div>
        <div
          ndSidebarContainer
          aria-label="Main"
          class="fixed inset-y-0 start-0 flex w-64 flex-col gap-1 border-e bg-white p-2 transition-[inset-inline-start] group-data-[collapsible=offcanvas]:-start-64 max-md:hidden data-mobile:relative data-mobile:flex data-mobile:h-full"
        >
          <nav class="grid gap-1">
            <a
              ndSidebarMenuButton
              href="#inbox"
              active
              class="rounded px-2 py-1 aria-[current=page]:bg-gray-100"
              >Inbox</a
            >
            <a ndSidebarMenuButton href="#drafts" class="rounded px-2 py-1"
              >Drafts</a
            >
            <a ndSidebarMenuButton href="#sent" class="rounded px-2 py-1"
              >Sent</a
            >
          </nav>
          <button
            ndSidebarRail
            title="Toggle sidebar"
            class="absolute inset-y-0 -end-2 w-4"
          ></button>
        </div>
      </div>
      <main class="grid flex-1 content-start justify-items-start gap-4 p-8">
        <h1 class="text-2xl font-semibold">Sidebar</h1>
        <button ndSidebarTrigger class="rounded-md border px-3 py-1">
          Toggle sidebar
        </button>
        <button class="rounded-md border px-3 py-1">Next</button>
      </main>
    </div>
  `,
})
export default class SidebarDemo {}
