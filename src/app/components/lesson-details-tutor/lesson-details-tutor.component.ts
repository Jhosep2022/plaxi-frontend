import { Component, OnInit, inject, signal, input, numberAttribute } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeccionDto } from '../../models/LeccionDto';
import { LeccionService } from '../../services/leccion.service';
import { CursoDto } from 'src/app/models/CursoDto';
import { TemaService } from 'src/app/services/tema.service';
import { TemaDto } from 'src/app/models/TemaDto';
import { PaginadoDto } from 'src/app/models/PaginadoDto';
import { SessionService } from '../../core/auth/session.service';

@Component({
    selector: 'app-lesson-details-tutor',
    templateUrl: './lesson-details-tutor.component.html',
    styleUrls: ['./lesson-details-tutor.component.css'],
    imports: [RouterLink]
})
export class LessonDetailsTutorComponent implements OnInit {
  protected readonly session = inject(SessionService);
  readonly cursoId = input.required({ transform: numberAttribute });
  readonly leccionId = input.required({ transform: numberAttribute });
  private router = inject(Router);
  private temaService = inject(TemaService);
  private leccionService = inject(LeccionService);
  private snackBar = inject(MatSnackBar);

  course: CursoDto | null = null;
  readonly leccion = signal<LeccionDto | null>(null);
  userId: number | null = null;
  readonly temas = signal<TemaDto[]>([]);
  readonly courseId = signal<number | null>(null);
  ngOnInit(): void {
    this.userId = this.session.usuarioId();

    const lessonId = this.leccionId();

    if (lessonId) {
      this.loadLessonDetails(lessonId);
      this.loadTemas(lessonId);
    }
  }

  loadTemas(lessonId: number): void {
    const paginadoDto: PaginadoDto = {
      page: 0,
      size: 10,
      sortBy: 'idTema',
      sortDir: 'ASC',
    };

    this.temaService.getTemasByLeccion(lessonId, paginadoDto).subscribe({
      next: (response) => {
        this.temas.set(response.content || []);
      },
      error: (error) => {
        console.error('Error al cargar los temas:', error);
      },
    });
  }

  // Método para cargar los detalles de la lección y asignar courseId
  loadLessonDetails(lessonId: number): void {
    this.leccionService.getLeccionById(lessonId).subscribe({
      next: (data) => {
        this.leccion.set(data);
        this.courseId.set(data.cursoId);
      },
      error: (error) => console.error('Error al cargar los detalles del curso:', error)
    });
  }

  // Lógica para volver a la página de detalles del curso
  goBack(): void {
    if (this.courseId()) {
      this.router.navigate(this.session.rutaRol('contenido', 'cursos', this.cursoId()));
    } else {
      this.snackBar.open('No se pudo encontrar el curso relacionado.', 'Cerrar', {
        duration: 3000
      });
    }
  }

  deleteLesson() {
    if (confirm(`¿Estás seguro de que deseas eliminar la leccion: ${this.leccion()?.titulo}?`)) {
      this.leccionService.deleteLeccion(this.leccion()?.idLeccion!).subscribe({
        next: () => console.log('Leccion eliminada exitosamente'),
        error: (error) => console.error('Error al eliminar la leccion:', error)
      });

      console.log(`leccion con ID ${this.course?.idCurso} eliminada`);
      this.snackBar.open('Leccion eliminada exitosamente', 'Cerrar', {
        duration: 3000
      });
      this.router.navigate(this.session.rutaRol('contenido', 'cursos', this.cursoId()));
    }
  }
}
