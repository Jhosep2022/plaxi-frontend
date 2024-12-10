import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LeccionService } from '../../services/leccion.service';
import { CourseService } from '../../services/course.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Categoria } from 'src/app/models/categoriaDto';
import { CategoriaService } from 'src/app/services/categoria.service';
import { AuthService } from 'src/app/services/auth.service';
import { CursoDto } from 'src/app/models/CursoDto';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-lesson-form',
  templateUrl: './lesson-form.component.html',
  styleUrls: ['./lesson-form.component.css']
})
export class LessonFormComponent implements OnInit {
  course: CursoDto | null = null;
  userId: number | null = null;
  lessonForm!: FormGroup;
  categorias: Categoria[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CourseService,
    private leccionService: LeccionService,
    private fb: FormBuilder,
    private categoriaService: CategoriaService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategorias();
    this.loadUserId();
    this.loadCourseDetails();
  }

  // Inicializa el formulario con sus validaciones
  private initializeForm(): void {
    this.lessonForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      contenido: ['', [Validators.maxLength(250)]],
      duracion: [60, [Validators.required, Validators.max(60)],],
      orden: [1, Validators.required],
      estado: [true, Validators.required]
    });
  }

  // Cargar las categorías desde el servicio
  private loadCategorias(): void {
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

  // Carga el ID del usuario desde localStorage con manejo de errores
  private loadUserId(): void {
    try {
      const storedUserId = localStorage.getItem('idUsuario');
      if (storedUserId) {
        this.userId = Number(storedUserId);
        console.log('User ID cargado desde localStorage:', this.userId);
      } else {
        throw new Error('No se encontró el ID del usuario logueado en localStorage.');
      }
    } catch (error) {
      console.error('Error al acceder a localStorage:', error);
      this.snackBar.open('Error al cargar el ID del usuario. Por favor, inicie sesión nuevamente.', 'Cerrar', {
        duration: 3000
      });
    }
  }

  // Cargar los detalles del curso desde la API
  private loadCourseDetails(): void {
    const courseId = Number(this.route.snapshot.paramMap.get('id'));
    if (courseId) {
      this.cursoService.getCursoById(courseId).subscribe({
        next: (data) => {
          this.course = data;
          console.log('Detalles del curso cargados:', this.course);
        },
        error: (error) => {
          console.error('Error al cargar los detalles del curso:', error);
        }
      });
    } else {
      console.error('No se encontró un ID de curso válido en la URL.');
    }
  }

  // Método para enviar el formulario
  onSubmit(): void {
    console.log('Form submit triggered');
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

      console.log('Leccion DTO:', leccionDto);

      this.leccionService.createLeccion(leccionDto).subscribe({
        next: () => {
          console.log('Lección creada exitosamente');
          this.snackBar.open('¡La lección se ha creado exitosamente!', 'Cerrar', {
            duration: 3000
          });

          // Redirigir a `CourseDetailsTutorComponent` con el `courseId`
          this.router.navigate([`/course-details-tutor/${courseId}`]);
        },
        error: (error) => {
          console.error('Error en la creación de la lección:', error);
          this.snackBar.open('Error al crear la lección. Por favor, revisa los campos.', 'Cerrar', {
            duration: 3000
          });
        }
      });
    } else {
      console.log('Formulario inválido o falta de información');
      this.snackBar.open('Error al crear la lección. Por favor, revisa los campos.', 'Cerrar', {
        duration: 3000
      });
    }
  }


  // Método para cancelar la creación de la lección y redirigir
  onCancel(): void {
    const courseId = Number(this.route.snapshot.paramMap.get('id'));
    if (courseId) {
      this.router.navigate([`/course-details-tutor/${courseId}`]);
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
