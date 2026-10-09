import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/ui/breadcrumb/breadcrumb';

/** A trail to the current page, with middle items collapsed. */
@Component({
  selector: 'example-breadcrumb-demo',
  imports: [
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
    NdIcon,
  ],
  template: `
    <nav ndBreadcrumb>
      <ol ndBreadcrumbList>
        <li ndBreadcrumbItem><a ndBreadcrumbLink href="#home">Home</a></li>
        <li ndBreadcrumbSeparator><svg ndIcon="chevron-right"></svg></li>
        <li ndBreadcrumbItem>
          <span ndBreadcrumbEllipsis><svg ndIcon="ellipsis"></svg></span>
        </li>
        <li ndBreadcrumbSeparator><svg ndIcon="chevron-right"></svg></li>
        <li ndBreadcrumbItem>
          <a ndBreadcrumbLink href="#components">Components</a>
        </li>
        <li ndBreadcrumbSeparator><svg ndIcon="chevron-right"></svg></li>
        <li ndBreadcrumbItem><span ndBreadcrumbPage>Breadcrumb</span></li>
      </ol>
    </nav>
  `,
})
export class BreadcrumbDemoExample {}
