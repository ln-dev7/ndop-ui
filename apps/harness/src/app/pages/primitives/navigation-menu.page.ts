import { Component } from '@angular/core';
import {
  NdNavigationMenu,
  NdNavigationMenuContent,
  NdNavigationMenuItem,
  NdNavigationMenuLink,
  NdNavigationMenuList,
  NdNavigationMenuTrigger,
} from '@ndop/primitives/navigation-menu';

/**
 * Navigation Menu demo (`/primitives/navigation-menu`): two panels of
 * links and a top-level link.
 */
@Component({
  selector: 'harness-navigation-menu-demo',
  imports: [
    NdNavigationMenu,
    NdNavigationMenuList,
    NdNavigationMenuItem,
    NdNavigationMenuTrigger,
    NdNavigationMenuContent,
    NdNavigationMenuLink,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Navigation Menu</h1>
      <nav ndNavigationMenu aria-label="Main" class="relative">
        <ul ndNavigationMenuList class="flex gap-2">
          <li ndNavigationMenuItem value="docs" class="relative">
            <button ndNavigationMenuTrigger [class]="trigger">Docs</button>
            <div ndNavigationMenuContent [class]="panel">
              <a ndNavigationMenuLink href="#install">Installation</a>
              <a ndNavigationMenuLink href="#theming">Theming</a>
            </div>
          </li>
          <li ndNavigationMenuItem value="components" class="relative">
            <button ndNavigationMenuTrigger [class]="trigger">
              Components
            </button>
            <div ndNavigationMenuContent [class]="panel">
              <a ndNavigationMenuLink href="#button">Button</a>
              <a ndNavigationMenuLink href="#dialog">Dialog</a>
            </div>
          </li>
          <li ndNavigationMenuItem>
            <a ndNavigationMenuLink href="#blog" active [class]="trigger">
              Blog
            </a>
          </li>
        </ul>
      </nav>
      <button class="rounded-md border px-3 py-1">Next</button>
    </main>
  `,
})
export default class NavigationMenuDemo {
  protected readonly trigger = 'rounded-md border px-3 py-1';
  protected readonly panel =
    'absolute top-full z-10 mt-1 grid w-48 gap-1 rounded-md border bg-white p-2';
}
