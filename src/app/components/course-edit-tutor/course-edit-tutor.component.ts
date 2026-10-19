import { Component, OnInit, inject, signal, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CourseService } from 'src/app/services/course.service';
import { CursoDto, ActualizarCursoDto } from 'src/app/models/CursoDto';
import { CategoriaService } from 'src/app/services/categoria.service';
import { Categoria } from 'src/app/models/categoriaDto';
import { SessionService } from '../../core/auth/session.service';

@Component({
    selector: 'app-course-edit-tutor',
    templateUrl: './course-edit-tutor.component.html',
    styleUrls: ['./course-edit-tutor.component.css'],
    imports: [FormsModule, ReactiveFormsModule]
})
export class CourseEditTutorComponent implements OnInit {
  protected readonly session = inject(SessionService);
  readonly cursoId = input.required({ transform: numberAttribute });
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private courseService = inject(CourseService);
  private categoriaService = inject(CategoriaService);

  courseForm!: FormGroup;
  selectedFile: File | null = null;
  readonly fileError = signal<string | null>(null);
  readonly previewUrl = signal<string | ArrayBuffer | null>(null);
  courseId!: number; // ID del curso a editar
  readonly categorias = signal<Categoria[]>([]);
  ngOnInit(): void {
    // Obtener el ID del curso de la URL
    this.courseId = this.cursoId();

    // Inicializar el formulario
    this.courseForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(250)]],
      dificultad: ['Beginner', Validators.required],
      estado: [true, Validators.required],
      Categoria_id_categoria: [0, [Validators.required, Validators.min(1)]], // ID de la categoría seleccionada
    });

    // Cargar los datos del curso y las categorías
    this.loadCourseData();
    this.loadCategorias();
  }

  // Método para cargar los datos actuales del curso
  private loadCourseData(): void {
    this.courseService.getCursoById(this.courseId).subscribe({
      next: (data: CursoDto) => {
        this.courseForm.patchValue({
          nombre: data.nombre,
          descripcion: data.descripcion,
          dificultad: data.dificultad,
          estado: data.estado,
          Categoria_id_categoria: data.categoriaId,
        });
        this.previewUrl.set(data.portada || null); // Mostrar la imagen actual si existe
      },
      error: (err) => {
        console.error('Error al cargar los datos del curso:', err);
        this.snackBar.open('Error al cargar los datos del curso.', 'Cerrar', {
          duration: 3000,
          verticalPosition: 'bottom',
        });
      },
    });
  }

  // Método para cargar las categorías disponibles
  private loadCategorias(): void {
    this.categoriaService.getAllCategorias().subscribe({
      next: (data: Categoria[]) => {
        this.categorias.set(data);
        console.log('Categorías cargadas:', this.categorias());
      },
      error: (err) => {
        console.error('Error al cargar las categorías:', err);
        this.snackBar.open('Error al cargar las categorías.', 'Cerrar', {
          duration: 3000,
          verticalPosition: 'bottom',
        });
      },
    });
  }

  // Manejar la selección de un archivo
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      const validExtensions = ['image/jpeg', 'image/png', 'image/jpg'];
      if (validExtensions.includes(file.type)) {
        this.selectedFile = file;
        this.fileError.set(null);

        const reader = new FileReader();
        reader.onload = () => {
          this.previewUrl.set(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        this.fileError.set('Por favor, selecciona un archivo con formato .jpg, .jpeg o .png');
        this.selectedFile = null;
        this.previewUrl.set(null);
      }
    }
  }

  // Método para enviar el formulario y actualizar el curso
  onSubmit(): void {
    if (this.courseForm.valid) {
      const updatedCourse: ActualizarCursoDto = {
        nombre: this.courseForm.value.nombre,
        descripcion: this.courseForm.value.descripcion,
        dificultad: this.courseForm.value.dificultad,
        estado: this.courseForm.value.estado,
        categoriaId: this.courseForm.value.Categoria_id_categoria, // ID de la categoría seleccionada
        usuarioCreadorId: 1, // Cambiar por el ID real del usuario logueado
        portada: this.selectedFile || undefined,
      };

      const formData = new FormData();
      formData.append('nombre', updatedCourse.nombre);
      formData.append('descripcion', updatedCourse.descripcion);
      formData.append('dificultad', updatedCourse.dificultad);
      formData.append('estado', updatedCourse.estado.toString());
      formData.append('categoriaId', updatedCourse.categoriaId.toString());
      formData.append('usuarioCreadorId', updatedCourse.usuarioCreadorId.toString());
      if (this.selectedFile) {
        formData.append('portada', this.selectedFile, this.selectedFile.name);
      }

      this.courseService.updateCurso(this.courseId, updatedCourse).subscribe({
        next: () => {
          this.snackBar.open('¡El curso se ha actualizado exitosamente!', 'Cerrar', {
            duration: 3000,
            verticalPosition: 'bottom',
          });
          this.router.navigate(this.session.rutaRol('contenido', 'cursos'));
        },
        error: (err) => {
          console.error('Error al actualizar el curso:', err);
          this.snackBar.open('Error al actualizar el curso.', 'Cerrar', {
            duration: 3000,
            verticalPosition: 'bottom',
          });
        },
      });
    } else {
      this.courseForm.markAllAsTouched();
      this.snackBar.open('Por favor, corrige los errores en el formulario.', 'Cerrar', {
        duration: 3000,
        verticalPosition: 'bottom',
      });
    }
  }

  onCancel(): void {
    this.router.navigate(this.session.rutaRol('contenido', 'cursos', this.courseId));
  }


  // Método para mostrar mensajes de error en el formulario
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
    return '';
  }
}
