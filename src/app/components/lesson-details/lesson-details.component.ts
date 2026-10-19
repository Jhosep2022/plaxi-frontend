import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeccionDto } from '../../models/LeccionDto';
import { LeccionService } from '../../services/leccion.service';
import { TemaService } from 'src/app/services/tema.service';
import { TemaDto } from 'src/app/models/TemaDto';

@Component({
    selector: 'app-lesson-details',
    templateUrl: './lesson-details.component.html',
    styleUrls: ['./lesson-details.component.css'],
    imports: [RouterLink]
})
export class LessonDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private temaService = inject(TemaService);
  private leccionService = inject(LeccionService);
  private snackBar = inject(MatSnackBar);

  courseId: number | null = null; // Captura el ID del curso
  readonly leccion = signal<LeccionDto | null>(null);
  readonly temas = signal<TemaDto[]>([]);
  ngOnInit(): void {
    // Captura el `courseId` de los parámetros de consulta
    const courseIdParam = this.route.snapshot.queryParamMap.get('courseId');
    this.courseId = courseIdParam ? Number(courseIdParam) : null;

    // Captura el `lessonId` de los parámetros de la URL
    const lessonId = Number(this.route.snapshot.paramMap.get('id'));
    if (lessonId) {
      this.loadLessonDetails(lessonId);
      this.loadTemas(lessonId);
    }
  }

  // Método para cargar los detalles de la lección
  loadLessonDetails(lessonId: number): void {
    this.leccionService.getLeccionById(lessonId).subscribe({
      next: (data) => {
        this.leccion.set(data);
      },
      error: (error) => {
        console.error('Error al cargar los detalles de la lección:', error);
      }
    });
  }

  // Método para cargar los temas de la lección
  loadTemas(lessonId: number): void {
    const paginadoDto = { page: 0, size: 10, sortBy: 'orden', sortDir: 'desc' };
    this.temaService.getTemasByLeccion(lessonId, paginadoDto).subscribe(
      (response) => {
        this.temas.set(response.content || []);
      },
      (error) => {
        console.error('Error al cargar los temas de la lección:', error);
      }
    );
  }

  // Método para volver al detalle del curso
  goBack(): void {
    if (this.courseId !== null) {
      this.router.navigate(['/course-details', this.courseId]); // Navegar a la pantalla del curso
    } else {
      console.error('No se encontró el ID del curso');
    }
  }
}
