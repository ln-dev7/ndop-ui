import { Component } from '@angular/core';
import { ThemesGallery } from '../../themes/themes-gallery';

/**
 * The theme gallery (`/themes`): every theme (ADR-0023).
 */
@Component({
  selector: 'docs-themes-page',
  imports: [ThemesGallery],
  template: `<docs-themes-gallery />`,
})
export default class ThemesPage {}
