import { Component } from '@angular/core';
import { BlocksGallery } from '../../blocks/blocks-gallery';

/**
 * The blocks gallery (`/blocks`): every block (ADR-0022).
 */
@Component({
  selector: 'docs-blocks-page',
  imports: [BlocksGallery],
  template: `<docs-blocks-gallery />`,
})
export default class BlocksPage {}
