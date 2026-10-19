import { Injectable, inject } from '@angular/core';
import { SnackBarService } from '../../services/snack-bar.service';

// Avisos breves de éxito o error para las pantallas de gestión
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private snackBar = inject(SnackBarService);

  exito(mensaje: string): void {
    this.snackBar.openSnackBar(mensaje, 'Cerrar', undefined, 'success-snackbar');
  }

  error(mensaje: string): void {
    this.snackBar.openSnackBar(mensaje, 'Cerrar', undefined, 'error-snackbar');
  }
}
