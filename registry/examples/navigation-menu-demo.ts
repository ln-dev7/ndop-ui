import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/ui/navigation-menu/navigation-menu';

/**
 * A site's navigation: two buttons with panels of links, and a top-level
 * link to the current page. Each panel follows its button in the page, so
 * Tab moves into its links.
 */
@Component({
  selector: 'example-navigation-menu-demo',
  imports: [
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    NdIcon,
  ],
  template: `
    <nav ndNavigationMenu aria-label="Site">
      <ul ndNavigationMenuList>
        <li ndNavigationMenuItem>
          <button ndNavigationMenuTrigger>
            Getting started <svg ndIcon="chevron-down"></svg>
          </button>
          <div ndNavigationMenuContent>
            <ul class="grid w-[300px] gap-1 md:w-[400px] md:grid-cols-2">
              @for (link of guides; track link.href) {
                <li>
                  <a ndNavigationMenuLink [href]="link.href">
                    <span class="font-medium">{{ link.title }}</span>
                    <span class="text-muted-foreground line-clamp-2">
                      {{ link.text }}
                    </span>
                  </a>
                </li>
              }
            </ul>
          </div>
        </li>
        <li ndNavigationMenuItem>
          <button ndNavigationMenuTrigger>
            Components <svg ndIcon="chevron-down"></svg>
          </button>
          <div ndNavigationMenuContent>
            <ul class="grid w-[200px] gap-1">
              @for (link of components; track link.href) {
                <li>
                  <a ndNavigationMenuLink [href]="link.href">{{
                    link.title
                  }}</a>
                </li>
              }
            </ul>
          </div>
        </li>
        <li ndNavigationMenuItem>
          <a ndNavigationMenuLink href="#docs" active [class]="triggerStyle">
            Docs
          </a>
        </li>
      </ul>
    </nav>
  `,
})
export class NavigationMenuDemoExample {
  protected readonly triggerStyle = navigationMenuTriggerStyle;
  protected readonly guides = [
    {
      href: '#introduction',
      title: 'Introduction',
      text: 'Accessible Angular components you copy into your app.',
    },
    {
      href: '#installation',
      title: 'Installation',
      text: 'Set up Ndop in a new or existing Angular app.',
    },
    {
      href: '#theming',
      title: 'Theming',
      text: 'Colors, radius and fonts, as CSS variables.',
    },
    {
      href: '#forms',
      title: 'Forms',
      text: 'Bind Signal Forms, reactive or template-driven forms.',
    },
  ];
  protected readonly components = [
    { href: '#dialog', title: 'Dialog' },
    { href: '#select', title: 'Select' },
    { href: '#tabs', title: 'Tabs' },
  ];
}
