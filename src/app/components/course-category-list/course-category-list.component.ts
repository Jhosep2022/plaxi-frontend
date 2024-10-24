import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CursoService } from '../../services/course.service'; // Importar el servicio de cursos
import { CursoDto } from '../../models/CursoDto'; // Importar el modelo de curso

// Interfaz para la categoría
interface Category {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-course-category-list',
  templateUrl: './course-category-list.component.html',
  styleUrls: ['./course-category-list.component.css']
})
export class CourseCategoryListComponent implements OnInit {
  // Lista de categorías simulada (puedes ajustar esto según necesites)
  categories: Category[] = [
    { id: 1, nombre: 'Programación' },
    { id: 2, nombre: 'Psicología' },
    { id: 3, nombre: 'Data Science' }
  ];

  // Lista de cursos obtenida de la API
  courses: CursoDto[] = []; // Inicializa como un array vacío para almacenar cursos desde la API
  filteredCourses: CursoDto[] = []; // Cursos filtrados por categoría
  pagedCourses: CursoDto[] = []; // Cursos mostrados en la página actual
  selectedCategory: Category | null = null; // Categoría seleccionada
  currentPage: number = 1;
  itemsPerPage: number = 6; // Número de cursos por página
  totalPages: number = 1;

  constructor(private router: Router, private cursoService: CursoService) {}

  ngOnInit(): void {
    // Obtener todos los cursos desde la API cuando el componente se inicie
    this.getCoursesFromApi();

    // Seleccionar la primera categoría por defecto
    this.selectedCategory = this.categories[0];
  }

  // Obtener todos los cursos desde la API
  getCoursesFromApi(): void {
    this.cursoService.getAllCursos().subscribe({
      next: (data) => {
        this.courses = data; // Actualiza la lista de cursos con la respuesta de la API
        console.log('Cursos obtenidos de la API:', this.courses);
        this.filterCoursesByCategory(); // Filtrar los cursos por la categoría seleccionada (si hay alguna)
      },
      error: (err) => {
        console.error('Error al obtener cursos desde la API:', err);
      }
    });
  }

  // Filtrar cursos por categoría seleccionada
  selectCategory(category: Category): void {
    this.selectedCategory = category;
    this.filterCoursesByCategory();
  }

  // Filtrar los cursos según la categoría seleccionada y actualizar la paginación
  filterCoursesByCategory(): void {
    if (this.selectedCategory) {
      // Filtrar los cursos según la categoría seleccionada
      this.filteredCourses = this.courses.filter(course => course.categoriaId === this.selectedCategory?.id);
    } else {
      // Mostrar todos los cursos si no hay categoría seleccionada
      this.filteredCourses = this.courses;
    }

    // Actualizar la paginación con la lista filtrada
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredCourses.length / this.itemsPerPage);
    this.updatePagedCourses();
  }

  // Actualizar los cursos mostrados en la página actual
  updatePagedCourses(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.pagedCourses = this.filteredCourses.slice(startIndex, endIndex);
  }

  // Cambiar de página
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedCourses();
    }
  }

  // Redirigir a la página de detalles del curso
  viewCourse(course: CursoDto): void {
    this.router.navigate(['/course-details', course.idCurso]); // Navegar a la vista de detalles del curso con el ID del curso
  }

}
