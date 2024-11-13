import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LeccionService } from '../../services/leccion.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeccionDto } from 'src/app/models/LeccionDto';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-lesson-edit',
  templateUrl: './lesson-edit.component.html',
  styleUrls: ['./lesson-edit.component.css']
})
export class LessonEditComponent implements OnInit {
  lessonForm!: FormGroup;
  leccionId!: number;
  leccionData!: LeccionDto;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private leccionService: LeccionService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    // Initialize the form
    this.lessonForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(150)]],
      contenido: ['', [Validators.maxLength(250)]],
      duracionEstimada: [60, Validators.required],
      orden: [1, Validators.required],
      estado: [true, Validators.required]
    });

    // Get the leccion ID from the route
    this.leccionId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.leccionId) {
      // Load leccion details
      this.loadLeccionDetails(this.leccionId);
    } else {
      this.snackBar.open('ID de lección no proporcionado.', 'Cerrar', {
        duration: 3000
      });
      this.router.navigate(['/']);
    }
  }

  // Load leccion details
  loadLeccionDetails(id: number): void {
    this.leccionService.getLeccionById(id).subscribe({
      next: (data) => {
        this.leccionData = data;
        this.populateForm();
      },
      error: (error) => {
        console.error('Error al cargar la lección:', error);
        this.snackBar.open('Error al cargar la lección.', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  // Populate the form with leccion data
  populateForm(): void {
    this.lessonForm.patchValue({
      titulo: this.leccionData.titulo,
      contenido: this.leccionData.contenido,
      duracionEstimada: this.leccionData.duracionEstimada,
      orden: this.leccionData.orden,
      estado: this.leccionData.estado
    });
  }

  // Submit the form
  onSubmit(): void {
    if (this.lessonForm.valid) {
      const updatedLeccion: LeccionDto = {
        idLeccion: this.leccionId,
        cursoId: this.leccionData.cursoId,
        ...this.lessonForm.value
      };

      // Proceed with confirmation dialog
      this.confirmSave(updatedLeccion);
    } else {
      this.snackBar.open('Por favor, corrige los errores en el formulario.', 'Cerrar', {
        duration: 3000
      });
    }
  }

  // Confirm save action
  confirmSave(leccion: LeccionDto): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        message: '¿Estás seguro de que deseas guardar los cambios?',
        buttonText: {
          ok: 'Guardar',
          cancel: 'Cancelar'
        }
      }
    });
  
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.saveChanges(leccion);
      }
    });
  }

  // Cancel editing
  onCancel(): void {
    this.router.navigate(['/course-details', this.leccionData.cursoId]);
  }

  getErrorMessage(field: string): string {
    if (this.lessonForm.get(field)?.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (this.lessonForm.get(field)?.hasError('maxlength')) {
      return `Máximo ${this.lessonForm.get(field)?.errors?.['maxlength'].requiredLength} caracteres permitidos.`;
    }
    return '';
  }  

  saveChanges(leccion: LeccionDto): void {
    console.log('Leccion a actualizar:', leccion);
    this.leccionService.updateLeccion(leccion).subscribe({
      next: () => {
        this.snackBar.open('Lección actualizada con éxito.', 'Cerrar', {
          duration: 3000
        });
        this.router.navigate(['/course-details', leccion.cursoId]);
      },
      error: (error) => {
        console.error('Error al actualizar la lección:', error);
        this.snackBar.open('Error al actualizar la lección.', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }  
}
