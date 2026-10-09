import { Component } from '@angular/core';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/ui/breadcrumb/breadcrumb';

/** A trail with slashes between the items. */
@Component({
  selector: 'example-breadcrumb-separator',
  imports: [
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
  ],
  template: `
    <nav ndBreadcrumb label="Settings breadcrumb">
      <ol ndBreadcrumbList>
        <li ndBreadcrumbItem><a ndBreadcrumbLink href="#home">Home</a></li>
        <li ndBreadcrumbSeparator>/</li>
        <li ndBreadcrumbItem>
          <a ndBreadcrumbLink href="#settings">Settings</a>
        </li>
        <li ndBreadcrumbSeparator>/</li>
        <li ndBreadcrumbItem><span ndBreadcrumbPage>Billing</span></li>
      </ol>
    </nav>
  `,
})
export class BreadcrumbSeparatorExample {}
