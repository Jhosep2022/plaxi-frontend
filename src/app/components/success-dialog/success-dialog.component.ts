import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-success-dialog',
    templateUrl: './success-dialog.component.html',
    styleUrls: ['./success-dialog.component.css'],
})
export class SuccessDialogComponent {
  dialogRef = inject<MatDialogRef<SuccessDialogComponent>>(MatDialogRef);
  data = inject<{
    message: string;
}>(MAT_DIALOG_DATA);


  // Cerrar el diálogo y redirigir a la lista de cursos
  onClose(): void {
    this.dialogRef.close();
  }
}
