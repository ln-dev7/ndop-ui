import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root of the test harness. Renders the file-based routes from
 * `src/app/pages`, one per primitive demo.
 */
@Component({
  selector: 'harness-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
