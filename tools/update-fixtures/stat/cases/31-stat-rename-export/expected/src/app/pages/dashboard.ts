import { Component } from '@angular/core';
import { StatCard } from '@/ui/stat/stat';

/** The dashboard's numbers. */
@Component({
  selector: 'app-dashboard',
  imports: [StatCard],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  /** Stats shown in the header, for tests. */
  static readonly parts = [StatCard];
}
