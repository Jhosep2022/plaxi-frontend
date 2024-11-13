import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InscripcionService } from '../../services/inscripcion.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeccionDto } from '../../models/LeccionDto';
import { PaginadoDto } from 'src/app/models/PaginadoDto';
import { LeccionService } from '../../services/leccion.service';
import { CursoDto } from 'src/app/models/CursoDto';
import { CourseService } from 'src/app/services/course.service';

import { TemaService } from 'src/app/services/tema.service';

@Component({
  selector: 'app-lesson-details',
  templateUrl: './lesson-details.component.html',
  styleUrls: ['./lesson-details.component.css']
})
export class LessonDetailsComponent implements OnInit {
  course: CursoDto | null = null;
  leccion: LeccionDto | null = null;
  userId: number | null = null;
  lecciones: LeccionDto[] = []; // Variable para almacenar las lecciones del curso

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursoService: CourseService,
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
      //this.loadLessons(lessonId); // Cargar lecciones del curso
    }
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

