import { Injectable, inject } from '@angular/core';
import { SnackBarService } from '../../services/snack-bar.service';

// Show brief success and error notifications.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(SnackBarService);

  success(message: string): void {
    this.snackBar.openSnackBar(message, 'Cerrar', undefined, 'success-snackbar');
  }

  error(message: string): void {
    this.snackBar.openSnackBar(message, 'Cerrar', undefined, 'error-snackbar');
  }
}
