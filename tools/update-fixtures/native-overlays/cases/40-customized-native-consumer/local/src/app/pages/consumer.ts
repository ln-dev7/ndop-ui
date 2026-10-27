import { Component } from '@angular/core';
import { Dialog as Modal, DialogContent } from '@/ui/dialog/dialog';
import { Sheet as Panel, SheetContent } from '@/ui/sheet/sheet';
import { Select as Choice } from '@/ui/select/select';
import { DropdownMenuGroup as Group } from '@/ui/dropdown-menu/dropdown-menu';

@Component({
  selector: 'app-consumer',
  imports: [Modal, DialogContent, Panel, SheetContent, Choice, Group],
  templateUrl: './consumer.html',
})
export class Consumer {}
