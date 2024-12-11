import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CursoDto } from 'src/app/models/CursoDto';
import { CourseService } from 'src/app/services/course.service';
import { CategoriaService } from 'src/app/services/categoria.service';

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
  // Lista de categorías obtenida de la API
  categories: Category[] = [];

  // Lista de cursos obtenida de la API
  courses: CursoDto[] = [];
  filteredCourses: CursoDto[] = [];
  pagedCourses: CursoDto[] = [];
  selectedCategory: Category | null = null;
  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 1;

  constructor(
    private router: Router, 
    private cursoService: CourseService,
    private categoriaService: CategoriaService // Importar el servicio de categorías
  ) {}

  ngOnInit(): void {
    // Obtener todas las categorías desde la API
    this.getCategoriesFromApi();

    // Obtener todos los cursos desde la API
    this.getCoursesFromApi();
  }

    // Obtener todas las categorías desde la API
  getCategoriesFromApi(): void {
    this.categoriaService.getAllCategorias().subscribe({
      next: (data) => {
        this.categories = data.map(categoria => ({
          id: categoria.idCategoria, 
          nombre: categoria.nombre 
        }));
        console.log('Categorías obtenidas y transformadas de la API:', this.categories);

        // Seleccionar la primera categoría por defecto, si existe
        if (this.categories.length > 0) {
          this.selectedCategory = this.categories[0];
          this.filterCoursesByCategory();
        }
      },
      error: (err) => {
        console.error('Error al obtener categorías desde la API:', err);
      }
    });
  }

  // Obtener todos los cursos desde la API
  getCoursesFromApi(): void {
    this.cursoService.getAllCursos().subscribe({
      next: (data) => {
        this.courses = data;
        console.log('Cursos obtenidos de la API:', this.courses);
        this.filterCoursesByCategory();
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
      this.filteredCourses = this.courses.filter(
        course => course.categoriaId === this.selectedCategory?.id
      );
    } else {
      this.filteredCourses = this.courses;
    }

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
    this.router.navigate(['/course-details', course.idCurso]);
  }
}
