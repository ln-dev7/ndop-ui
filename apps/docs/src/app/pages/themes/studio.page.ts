import { Component } from '@angular/core';
import { ThemeStudio } from '../../themes/theme-studio';

/**
 * The theme studio (`/themes/studio`, ADR-0023). A theme is in the URL:
 * `?t=` holds one the studio made, `?from=` names a gallery theme.
 */
@Component({
  selector: 'docs-theme-studio-page',
  imports: [ThemeStudio],
  template: `<docs-theme-studio />`,
})
export default class ThemeStudioPage {}
