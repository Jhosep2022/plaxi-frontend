import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-course-edit-tutor',
  templateUrl: './course-edit-tutor.component.html',
  styleUrls: ['./course-edit-tutor.component.css']
})
export class CourseEditTutorComponent implements OnInit {
  courseForm!: FormGroup;
  selectedFile: File | null = null; // Archivo seleccionado
  fileError: string | null = null; // Error relacionado con el archivo
  previewUrl: string | ArrayBuffer | null = null; // URL de vista previa de la imagen

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar // Se inyecta MatSnackBar
  ) {}

  ngOnInit(): void {
    this.courseForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(250)]],
      portada: [null], // Cambiar a null ya que no se usará una URL directa
      dificultad: ['Beginner', Validators.required],
      estado: [true, Validators.required],
      Categoria_id_categoria: [0, [Validators.required, Validators.min(1)]],
    });

    // Obtener los datos del curso de los parámetros
    this.route.queryParams.subscribe(params => {
      this.courseForm.patchValue({
        nombre: params['name'],
        descripcion: `Descripción del curso ${params['name']}`, // Valor simulado para la descripción
        dificultad: 'Beginner',
        estado: true,
        Categoria_id_categoria: 1, // Valor simulado de categoría
      });

      this.previewUrl = params['image']; // Mostrar la imagen actual del curso
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      const validExtensions = ['image/jpeg', 'image/png', 'image/jpg'];
      if (validExtensions.includes(file.type)) {
        this.selectedFile = file;
        this.fileError = null;

        const reader = new FileReader();
        reader.onload = () => {
          this.previewUrl = reader.result as string; // Convierte a base64
        };
        reader.readAsDataURL(file);

        this.courseForm.patchValue({ portada: file.name });
      } else {
        this.fileError = 'Por favor, selecciona un archivo con formato .jpg, .jpeg o .png';
        this.selectedFile = null;
        this.previewUrl = null;
      }
    }
  }


  onSubmit() {
    if (this.courseForm.valid) {
      console.log('Course Updated:', this.courseForm.value);

      // Mostramos el snackbar con el mensaje de éxito
      this.snackBar.open('¡El curso se ha actualizado exitosamente!', 'Cerrar', {
        duration: 3000, // Duración del snackbar en milisegundos
        horizontalPosition: 'center', // Posición horizontal
        verticalPosition: 'top', // Posición vertical
        panelClass: ['success-snackbar'] // Clase personalizada para el estilo del snackbar
      });

      // Redirigimos a la lista de cursos después de un breve retraso
      setTimeout(() => {
        this.router.navigate(['/my-courses']);
      }, 3000);
    } else {
      if (!this.selectedFile) {
        this.fileError = 'Por favor, selecciona una imagen válida para la portada del curso.';
      }
      this.courseForm.markAllAsTouched();

      // Mostramos un snackbar con mensaje de error
      this.snackBar.open('Error al actualizar el curso. Por favor, revisa los campos.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }

  onCancel() {
    this.router.navigate(['/course-details-tutor']);
  }

  getErrorMessage(field: string): string {
    if (this.courseForm.get(field)?.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (this.courseForm.get(field)?.hasError('maxlength')) {
      return `Máximo ${this.courseForm.get(field)?.errors?.['maxlength'].requiredLength} caracteres permitidos.`;
    }
    if (this.courseForm.get(field)?.hasError('min')) {
      return 'El valor debe ser mayor que cero.';
    }
    if (this.courseForm.get(field)?.hasError('pattern')) {
      return 'La URL debe ser válida y terminar en .png o .jpg';
    }
    return '';
  }
}
