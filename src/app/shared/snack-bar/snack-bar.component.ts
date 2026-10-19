import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-snack-bar',
    templateUrl: './snack-bar.component.html',
    styles: [`
    span {
      color: white;
    }
  `],
    imports: [MatButton]
})
export class SnackBarComponent {
  data = inject<{
    message: string;
    actionLabel?: string;
    action?: () => void;
}>(MAT_SNACK_BAR_DATA);
}
