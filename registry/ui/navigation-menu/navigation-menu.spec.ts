import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './navigation-menu';

/**
 * shadcn's classes as Ndop writes them: logical sides, and nothing for the
 * viewport and indicator, which Ndop doesn't have (ADR-0004, amendment 5).
 *
 * @param classes - A shadcn class string.
 * @returns The Ndop string, or `null` when dropped.
 */
function ndopClasses(classes: string): string | null {
  if (
    /viewport-(height|width)|top-full left-0 isolate|top-\[60%\]|data-\[state=hidden\]/.test(
      classes,
    )
  ) {
    return null;
  }
  if (classes.startsWith('relative top-[1px] ml-1 size-3')) {
    return '[&>svg]:relative [&>svg]:top-[1px] [&>svg]:ms-1 [&>svg]:size-3 [&>svg]:transition [&>svg]:duration-300 group-data-[state=open]:[&>svg]:rotate-180';
  }
  return classes.replace(
    'top-0 left-0 w-full p-2 pr-2.5',
    'top-0 start-0 w-full p-2 pe-2.5',
  );
}

describe('NavigationMenu', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('navigation-menu').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'navigation-menu',
        registrySource('ui/navigation-menu/navigation-menu.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('places panels under their items', async () => {
    await render(
      `<nav ndNavigationMenu aria-label="Main">
        <ul ndNavigationMenuList>
          <li ndNavigationMenuItem>
            <button ndNavigationMenuTrigger>Docs</button>
            <div ndNavigationMenuContent data-testid="panel">
              <a ndNavigationMenuLink href="#a" active>A</a>
            </div>
          </li>
        </ul>
      </nav>`,
      {
        imports: [
          NavigationMenu,
          NavigationMenuList,
          NavigationMenuItem,
          NavigationMenuTrigger,
          NavigationMenuContent,
          NavigationMenuLink,
        ],
      },
    );
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.getAttribute('data-viewport')).toBe('false');
    expect(screen.getByTestId('panel').hidden).toBe(true);
    expect(
      screen
        .getByRole('link', { name: 'A', hidden: true })
        .getAttribute('data-active'),
    ).toBe('true');
  });
});
