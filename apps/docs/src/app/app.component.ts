import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component of the docs site. Renders the file-based routes from
 * `src/app/pages`.
 */
@Component({
  selector: 'docs-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
