import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  Sidebar,
  SidebarContainer,
  SidebarContent,
  SidebarGap,
  SidebarInner,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './sidebar';

/** Physical sides in shadcn's classes, as Ndop's logical ones. */
const LOGICAL: [string, string][] = [
  ['group-data-[side=right]:rotate-180', 'group-data-[side=end]:rotate-180'],
  [
    'group-data-[side=left]:border-r group-data-[side=right]:border-l',
    'group-data-[side=start]:border-e group-data-[side=end]:border-s',
  ],
  [
    'group-data-[side=left]:-right-4 group-data-[side=right]:left-0',
    'group-data-[side=start]:-end-4 group-data-[side=end]:start-0',
  ],
  ['after:left-1/2', 'after:start-1/2'],
  [
    'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
    'in-data-[side=start]:cursor-w-resize in-data-[side=end]:cursor-e-resize',
  ],
  [
    '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
    '[[data-side=start][data-state=collapsed]_&]:cursor-e-resize [[data-side=end][data-state=collapsed]_&]:cursor-w-resize',
  ],
  ['after:left-full', 'after:start-full'],
  [
    '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
    '[[data-side=start][data-collapsible=offcanvas]_&]:-end-2',
  ],
  [
    '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
    '[[data-side=end][data-collapsible=offcanvas]_&]:-start-2',
  ],
  ['md:peer-data-[variant=inset]:ml-0', 'md:peer-data-[variant=inset]:ms-0'],
  ['peer-data-[state=collapsed]:ml-2', 'peer-data-[state=collapsed]:ms-2'],
  ['top-3.5 right-3', 'top-3.5 end-3'],
  ['top-1.5 right-1', 'top-1.5 end-1'],
  ['absolute right-1', 'absolute end-1'],
  ['text-left', 'text-start'],
  ['menu-item:pr-8', 'menu-item:pe-8'],
  ['border-l border-sidebar-border', 'border-s border-sidebar-border'],
];

/**
 * shadcn's classes as Ndop writes them: logical sides; the left and right
 * container variants become `start` and `end`; the mobile Sheet's classes
 * become the container's `data-mobile` ones, as the same container is the
 * mobile dialog; the menu skeleton's and the trigger's inner elements are
 * the user's markup; Input's and Separator's classes are inlined where the
 * sidebar composes them.
 *
 * @param classes - A shadcn class string.
 * @returns The Ndop string, or `null` when dropped.
 */
function ndopClasses(classes: string): string | null {
  const dropped = [
    'w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden',
    'sr-only',
    'flex h-full w-full flex-col',
    'size-4 rounded-md',
    'h-4 max-w-(--skeleton-width) flex-1',
    'text-xs',
    'text-sm',
  ];
  if (dropped.includes(classes)) {
    return null;
  }
  if (
    classes ===
    'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
  ) {
    return 'start-0 group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]';
  }
  if (
    classes ===
    'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]'
  ) {
    return 'end-0 group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]';
  }
  return LOGICAL.reduce(
    (result, [from, to]) => result.replace(from, to),
    classes,
  );
}

describe('Sidebar', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('sidebar').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'sidebar',
        registrySource('ui/sidebar/sidebar.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('sets the widths and styles a menu', async () => {
    await render(
      `<div ndSidebarProvider data-testid="wrapper">
        <div ndSidebar variant="floating" collapsible="icon">
          <div ndSidebarGap></div>
          <div ndSidebarContainer aria-label="Main">
            <div ndSidebarInner>
              <div ndSidebarContent>
                <ul ndSidebarMenu>
                  <li ndSidebarMenuItem>
                    <a ndSidebarMenuButton href="#inbox" active size="lg">Inbox</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <main ndSidebarInset>
          <button ndSidebarTrigger><span class="sr-only">Toggle sidebar</span></button>
        </main>
      </div>`,
      {
        imports: [
          SidebarProvider,
          Sidebar,
          SidebarGap,
          SidebarContainer,
          SidebarInner,
          SidebarContent,
          SidebarMenu,
          SidebarMenuItem,
          SidebarMenuButton,
          SidebarInset,
          SidebarTrigger,
        ],
      },
    );
    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper.style.getPropertyValue('--sidebar-width')).toBe('16rem');
    const link = screen.getByRole('link', { name: 'Inbox' });
    expect(link.getAttribute('data-active')).toBe('true');
    expect(link.getAttribute('data-size')).toBe('lg');
    expect(link.getAttribute('aria-current')).toBe('page');
    const container = document.querySelector('[data-slot=sidebar-container]');
    expect(container?.classList).toContain('p-2');
  });
});
