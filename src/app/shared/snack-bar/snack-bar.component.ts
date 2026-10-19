import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [MatButton]
})
export class SnackBarComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: { message: string, actionLabel?: string, action?: () => void }) {}
}
