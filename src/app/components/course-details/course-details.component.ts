import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-course-details',
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css']
})
export class CourseDetailsComponent implements OnInit {
  course: any; // Curso que se mostrará
  isEnrolled: boolean = false; // Estado de inscripción del usuario

  // Cursos simulados (puedes agregar más para prueba)
  courses = [
    {
      id: 1,
      title: 'Introduction to Computer Programming',
      description: 'Curso básico de programación. Aprende los fundamentos de la programación.',
      difficulty: 'Beginner',
      duration: 10,
      imageUrl: 'assets/Login_Image.png'
    },
    {
      id: 2,
      title: 'Psychology 101',
      description: 'Curso de introducción a la psicología. Conoce las bases de la psicología.',
      difficulty: 'Intermediate',
      duration: 8,
      imageUrl: 'assets/Login_Image.png'
    }
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    // Obtener el ID del curso de la URL
    const courseId = Number(this.route.snapshot.paramMap.get('id'));

    // Simular carga de datos del curso según el ID recibido
    this.course = this.courses.find(course => course.id === courseId);
  }

  // Lógica para inscribirse en el curso (simulada)
  enrollInCourse(): void {
    this.isEnrolled = true; // Cambia el estado a inscrito
    alert('Te has inscrito en el curso exitosamente!');
  }

  // Lógica para volver a la lista de cursos
  goBack(): void {
    this.router.navigate(['/course-categories']);
  }
}
