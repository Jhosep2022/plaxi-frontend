import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeccionDto } from '../../models/LeccionDto';
import { LeccionService } from '../../services/leccion.service';
import { CursoDto } from 'src/app/models/CursoDto';
import { TemaService } from 'src/app/services/tema.service';
import { TemaDto } from 'src/app/models/TemaDto';

@Component({
  selector: 'app-lesson-details-tutor',
  templateUrl: './lesson-details-tutor.component.html',
  styleUrls: ['./lesson-details-tutor.component.css']
})
export class LessonDetailsTutorComponent implements OnInit {
  course: CursoDto | null = null;
  leccion: LeccionDto | null = null;
  userId: number | null = null;
  temas: TemaDto[] = [];
  courseId: number | null = null; // Declara courseId aquí

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private temaService: TemaService,
    private leccionService: LeccionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const storedUserId = localStorage.getItem('idUsuario');

    if (storedUserId) {
      this.userId = Number(storedUserId);
    } else {
      this.router.navigate(['/login']);
      return;
    }

    const lessonId = Number(this.route.snapshot.paramMap.get('id'));

    if (lessonId) {
      this.loadLessonDetails(lessonId);
      this.loadTemas(lessonId);
    }
  }

  loadTemas(lessonId: number) {
    const paginadoDto = { page: 0, size: 10, sortBy: 'orden', sortDir: 'desc' };
    this.temaService.getTemasByLeccion(lessonId, paginadoDto).subscribe(
      (response) => {
        this.temas = response.content || []; // Aseguramos que siempre sea un array
      },
      (error) => {
        console.error('Error al cargar los temas del curso:', error);
      }
    );
  }

  // Método para cargar los detalles de la lección y asignar courseId
  loadLessonDetails(lessonId: number): void {
    this.leccionService.getLeccionById(lessonId).subscribe({
      next: (data) => {
        this.leccion = data;
        this.courseId = data.cursoId;
      },
      error: (error) => console.error('Error al cargar los detalles del curso:', error)
    });
  }

  // Lógica para volver a la página de detalles del curso
  goBack(): void {
    if (this.courseId) {
      this.router.navigate(['/course-details-tutor', this.courseId]);
    } else {
      this.snackBar.open('No se pudo encontrar el curso relacionado.', 'Cerrar', {
        duration: 3000
      });
    }
  }
}
