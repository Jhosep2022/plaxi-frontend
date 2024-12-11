import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TemaService } from '../../services/tema.service';
import { TemaDto } from '../../models/TemaDto';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-theme-edit',
  templateUrl: './theme-edit.component.html',
  styleUrls: ['./theme-edit.component.css']
})
export class ThemeEditComponent implements OnInit {
  themeForm!: FormGroup;
  temaId!: number;
  temaData!: TemaDto;
  selectedFile!: File | null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private temaService: TemaService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.themeForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(500)]],
      orden: [1, Validators.required],
      estado: [true, Validators.required],
      recursoMultimedia: ['']
    });

    this.temaId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.temaId) {
      this.loadTemaDetails(this.temaId);
    } else {
      this.snackBar.open('ID de tema no proporcionado.', 'Cerrar', {
        duration: 3000
      });
      this.router.navigate(['/']);
    }
  }

  // Load the theme details
  loadTemaDetails(id: number): void {
    this.temaService.getTemaById(id).subscribe({
      next: (data) => {
        this.temaData = data;
        this.populateForm();
      },
      error: (error) => {
        console.error('Error al cargar el tema:', error);
        this.snackBar.open('Error al cargar el tema.', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }

  // Populate the form with the current data
  populateForm(): void {
    this.themeForm.patchValue({
      titulo: this.temaData.titulo,
      descripcion: this.temaData.descripcion,
      orden: this.temaData.orden,
      estado: true, // asegúrate de que siempre se establezca a true
      recursoMultimedia: this.temaData.recursoMultimedia ? this.extractFileName(this.temaData.recursoMultimedia) : ''
    });
  }

  // Extract the file name from the resource path
  extractFileName(path: string): string {
    return path.split('/').pop() || '';
  }

  // Handle file selection
  onFileSelected(event: any): void {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    } else {
      this.selectedFile = null;
    }
  }

  // Submit the form
  onSubmit(): void {
    if (this.themeForm.valid) {
      const formValues = this.themeForm.value;
      console.log('Form values:', formValues);
      const updatedTema: TemaDto = {
        idTema: this.temaId,
        leccionId: this.temaData.leccionId,
        titulo: formValues.titulo,
        descripcion: formValues.descripcion,
        orden: formValues.orden,
        estado: true, // asegúrate de que siempre se establezca a true
        recursoMultimedia: this.temaData.recursoMultimedia // Mantén el recurso existente si no se ha cambiado
      };

      this.confirmSave(updatedTema);
    } else {
      this.snackBar.open('Por favor, corrige los errores en el formulario.', 'Cerrar', {
        duration: 3000
      });
    }
  }

  // Confirm before saving changes
  confirmSave(tema: TemaDto): void {
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
        this.saveChanges(tema);
      }
    });
  }

  // Save changes to the server
  saveChanges(tema: TemaDto): void {
    const hasFile = this.selectedFile !== null; // Verifica si hay un archivo seleccionado
    const uploadObservable = hasFile
      ? this.temaService.updateTemaWithFile(this.temaId, tema, this.selectedFile as File) // Asegura que no sea null
      : this.temaService.updateTemaWithoutFile(this.temaId, tema);
  
    uploadObservable.subscribe({
      next: () => {
        this.snackBar.open('Tema actualizado con éxito.', 'Cerrar', {
          duration: 3000
        });
        setTimeout(() => {
          this.router.navigate(['/my-courses']);
        }, 500);
      },
      error: (error) => {
        console.error('Error al actualizar el tema:', error);
        this.snackBar.open('Error al actualizar el tema.', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }
  
  

  // Cancel editing
  onCancel(): void {
    this.router.navigate(['/lesson-details', this.temaData.leccionId]);
  }

  // Get error messages for form validation
  getErrorMessage(field: string): string {
    if (this.themeForm.get(field)?.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (this.themeForm.get(field)?.hasError('maxlength')) {
      return `Máximo ${this.themeForm.get(field)?.errors?.['maxlength'].requiredLength} caracteres permitidos.`;
    }
    return '';
  }
}
