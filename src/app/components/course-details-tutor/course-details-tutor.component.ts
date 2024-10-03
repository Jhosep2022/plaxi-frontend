import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
interface Course {
  id: number;
  name: string;
  date: string;
  time: string;
  studentsEnrolled: number;
  image: string;
}


@Component({
  selector: 'app-course-details-tutor',
  templateUrl: './course-details-tutor.component.html',
  styleUrls: ['./course-details-tutor.component.css']
})
export class CourseDetailsTutorComponent implements OnInit {
  course: any;
  isEnrolled: boolean = false;

  constructor(private route: ActivatedRoute, private router: Router, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    // Obtener los parámetros de la ruta (detalles del curso se pasarán como parámetros de la URL)
    this.route.queryParams.subscribe(params => {
      this.course = {
        id: params['id'],
        name: params['name'],
        date: params['date'],
        time: params['time'],
        studentsEnrolled: params['studentsEnrolled'],
        image: params['image']
      };
    });
  }

  // Función para simular la inscripción en el curso
  enrollInCourse() {
    this.isEnrolled = true;
  }

  // Función para volver a la lista de cursos
  goBack() {
    this.router.navigate(['/my-courses']); // Navegar de vuelta a la lista de cursos
  }


  // Función para redirigir a la vista de edición con los datos del curso
  editCourse() {
    if (this.course) {
      this.router.navigate(['/course-edit-tutor'], {
        queryParams: {
          id: this.course.id,
          name: this.course.name,
          date: this.course.date,
          time: this.course.time,
          studentsEnrolled: this.course.studentsEnrolled,
          image: this.course.image
        }
      });
    }
  }

  deleteCourse() {
    if (confirm(`¿Estás seguro de que deseas eliminar el curso: ${this.course?.name}?`)) {
      // Simular eliminación de curso
      console.log(`Curso con ID ${this.course?.id} eliminado`);

      // Mostrar notificación de éxito
      this.snackBar.open('Curso eliminado exitosamente', 'Cerrar', {
        duration: 3000, // Duración del mensaje en milisegundos
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });

      // Redirigir a la lista de cursos
      this.router.navigate(['/my-courses']);
    }
  }

}
