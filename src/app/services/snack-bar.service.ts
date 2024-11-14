import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SnackBarComponent } from '../shared/snack-bar/snack-bar.component';

@Injectable({
  providedIn: 'root'
})
export class SnackBarService {

  constructor(private snackBar: MatSnackBar) {}

  openSnackBar(
    message: string,
    actionLabel: string = 'Cerrar',
    action?: () => void,
    panelClass: string = 'success-snackbar'
  ) {
    this.snackBar.openFromComponent(SnackBarComponent, {
      data: { message, actionLabel, action },
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [panelClass]
    }).afterDismissed().subscribe(() => {
      console.log("SnackBar dismissed");
    });
  }
}
