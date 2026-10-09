import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';

describe('Breadcrumb', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'breadcrumb',
        registrySource('ui/breadcrumb/breadcrumb.ts'),
        // The ellipsis's icon and its "More" text are the user's markup,
        // sized by the ellipsis.
        { 'size-4': '[&>svg]:size-4', 'sr-only': null },
      ),
    ).toEqual([]);
  });

  it('is a named navigation landmark marking the current page', async () => {
    await render(
      `<nav ndBreadcrumb>
        <ol ndBreadcrumbList>
          <li ndBreadcrumbItem><a ndBreadcrumbLink href="/">Home</a></li>
          <li ndBreadcrumbSeparator>/</li>
          <li ndBreadcrumbItem><span ndBreadcrumbPage>Settings</span></li>
        </ol>
      </nav>`,
      {
        imports: [
          Breadcrumb,
          BreadcrumbList,
          BreadcrumbItem,
          BreadcrumbLink,
          BreadcrumbSeparator,
          BreadcrumbPage,
        ],
      },
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
    expect(screen.getByText('Settings').getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
