import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeccionDto } from '../../models/LeccionDto';
import { LeccionService } from '../../services/leccion.service';
import { CursoDto } from 'src/app/models/CursoDto';
import { TemaService } from 'src/app/services/tema.service';
import { TemaDto } from 'src/app/models/TemaDto';

@Component({
  selector: 'app-lesson-details',
  templateUrl: './lesson-details.component.html',
  styleUrls: ['./lesson-details.component.css']
})
export class LessonDetailsComponent implements OnInit {
  course: CursoDto | null = null;
  leccion: LeccionDto | null = null;
  userId: number | null = null;
  temas: TemaDto[] = []; // Variable para almacenar las lecciones del curso

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private temaService: TemaService,
    private leccionService: LeccionService, // Agrega el servicio de lecciones
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
        this.temas = response.content; // Ajusta esto según la respuesta
      },
      (error) => {
        console.error('Error al cargar los temas del curso:', error);
      }
    );
  }

  // Método para cargar los detalles de la lección
  loadLessonDetails(lessonId: number): void {
    this.leccionService.getLeccionById(lessonId).subscribe({
      next: (data) => this.leccion = data,
      error: (error) => console.error('Error al cargar los detalles del curso:', error)
    });
  }

  // Lógica para volver a la lista de cursos
  goBack(): void {
    this.router.navigate(['/course-details', 1]);
  }
}

