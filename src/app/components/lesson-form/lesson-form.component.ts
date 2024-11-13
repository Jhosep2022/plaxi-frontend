import { Component, OnInit} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LeccionService } from '../../services/leccion.service';
import { CourseService } from '../../services/course.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Categoria } from 'src/app/models/categoriaDto';
import { CategoriaService } from 'src/app/services/categoria.service';
import { AuthService } from 'src/app/services/auth.service';
import { CursoDto } from 'src/app/models/CursoDto';

@Component({
  selector: 'app-lesson-form',
  templateUrl: './lesson-form.component.html',
  styleUrls: ['./lesson-form.component.css']
})
export class LessonFormComponent implements OnInit {
  course: CursoDto | null = null;
  isEnrolled: boolean = false;
  userId: number | null = null;
  lessonForm!: FormGroup;
  categorias: Categoria[] = []; // Almacenar las categorías obtenidas de la API

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CourseService,
    private leccionService: LeccionService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private categoriaService: CategoriaService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Inicializar el formulario con validaciones
    this.lessonForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      contenido: ['', [Validators.maxLength(250)]],
      duracion: [60, Validators.required],
      orden: [1, Validators.required],
      estado: [true, Validators.required]
    });

    this.loadCategorias();

    // Obtener el ID del usuario logueado directamente desde localStorage
    const storedUserId = localStorage.getItem('idUsuario');
    if (storedUserId) {
      this.userId = Number(storedUserId);
      console.log('User ID cargado desde localStorage:', this.userId);
    } else {
      console.error('Error: No se encontró el ID del usuario logueado en localStorage.');
      this.snackBar.open('Error al cargar el ID del usuario. Por favor, inicie sesión nuevamente.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar'],
      });
      return;
    }

    // Obtener el ID del curso de la URL
    const courseId = Number(this.route.snapshot.paramMap.get('id'));
    if (courseId) {
      // Cargar los detalles del curso usando el servicio
      this.loadCourseDetails(courseId);
    }
  }

  // Método para cargar los detalles del curso desde la API
  loadCourseDetails(courseId: number): void {
    this.cursoService.getCursoById(courseId).subscribe({
      next: (data) => {
        this.course = data;
        console.log('Detalles del curso cargados:', this.course);
      },
      error: (error) => {
        console.error('Error al cargar los detalles del curso:', error);
      }
    });
  }

  // Método para enviar el formulario
  onSubmit() {
    const courseId = Number(this.route.snapshot.paramMap.get('id'));

    if (this.lessonForm.valid && this.userId !== null && courseId) {
      const leccionDto = {
        titulo: this.lessonForm.value.nombre,
        orden: this.lessonForm.value.orden,
        duracionEstimada: this.lessonForm.value.duracion,
        contenido: this.lessonForm.value.contenido,
        cursoId: courseId,
        estado: this.lessonForm.value.estado
      };

      this.leccionService.createLeccion(leccionDto).subscribe({
        next: () => {
          this.snackBar.open('¡La lección se ha creado exitosamente!', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
          setTimeout(() => {
            this.router.navigate(['/my-courses']);
          }, 3000);
        },
        error: () => {
          this.snackBar.open('Error al crear la lección. Por favor, revisa los campos.', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.snackBar.open('Error al crear la lección. Por favor, revisa los campos.', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['error-snackbar']
      });
    }
  }


  // Cargar las categorías desde el servicio
  loadCategorias(): void {
    this.categoriaService.getAllCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        console.log('Categorías cargadas exitosamente:', this.categorias);
      },
      error: (error) => {
        console.error('Error al cargar las categorías:', error);
      },
    });
  }

  // Método para cancelar la creación de la lección y redirigir
  onCancel() {
    // Obtener el ID del curso desde la URL, que ya está cargado en `courseId`
    const courseId = Number(this.route.snapshot.paramMap.get('id'));

    // Redirigir al usuario a la página de detalles del curso, pasando el ID dinámicamente
    if (courseId) {
      this.router.navigate([`/course-details/${courseId}`]); // Redirige al curso con el ID correcto
    } else {
      console.error('No se encontró el ID del curso para redirigir.');
    }
  }

  // Obtener mensaje de error para un campo específico
  getErrorMessage(field: string): string {
    if (this.lessonForm.get(field)?.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (this.lessonForm.get(field)?.hasError('maxlength')) {
      return `Máximo ${this.lessonForm.get(field)?.errors?.['maxlength'].requiredLength} caracteres permitidos.`;
    }
    return '';
  }
}
