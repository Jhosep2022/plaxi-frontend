import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategoriaService } from 'src/app/services/categoria.service';
import { CourseService } from 'src/app/services/course.service';
import { AuthService } from 'src/app/services/auth.service';
import { Categoria } from 'src/app/models/categoriaDto';

@Component({
  selector: 'app-course-form',
  templateUrl: './course-form.component.html',
  styleUrls: ['./course-form.component.css'],
})
export class CourseFormComponent implements OnInit, AfterViewChecked {
  courseForm!: FormGroup;
  selectedFile: File | null = null; // Archivo seleccionado
  fileError: string | null = null; // Error relacionado con el archivo
  previewUrl: string | ArrayBuffer | null = null; // URL de vista previa de la imagen
  categorias: Categoria[] = []; // Almacenar las categorías obtenidas de la API
  userId: number | null = null; // Almacenar el ID del usuario logueado
  snackBarRef: any;

  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private categoriaService: CategoriaService,
    private cursoService: CourseService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Inicializar el formulario con validaciones
    this.courseForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(250)]],
      dificultad: ['Beginner', Validators.required],
      estado: [true, Validators.required],
      Categoria_id_categoria: [null, [Validators.required]],
    });

    this.loadCategorias();

    // Obtener el ID del usuario logueado directamente desde localStorage usando la misma clave
    const storedUserId = localStorage.getItem('idUsuario');
    if (storedUserId) {
      this.userId = Number(storedUserId);
      console.log('User ID cargado desde localStorage:', this.userId);
    } else {
      this.snackBar.open('Error al cargar el ID del usuario. Por favor, inicie sesión nuevamente.', 'Cerrar', {
        duration: 3000
      });
      return;
    }
  }

  ngAfterViewChecked(): void {
    if (this.snackBarRef) {
      this.snackBarRef.instance.snackBarContainer.nativeElement.style.bottom = '0';
    }
  }

  onCategoryChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedCategoryId = Number(selectElement.value);
    this.courseForm.patchValue({ Categoria_id_categoria: selectedCategoryId });
    console.log('Categoría seleccionada - ID:', selectedCategoryId);
  }

  // Cargar las categorías desde el servicio
  loadCategorias(): void {
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

  // Evento cuando se selecciona un archivo
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    console.log('Archivo seleccionado:', file);

    if (file) {
      const validExtensions = ['image/jpeg', 'image/png', 'image/jpg'];
      if (validExtensions.includes(file.type)) {
        this.selectedFile = file;
        this.fileError = null;

        // Mostrar vista previa de la imagen seleccionada
        const reader = new FileReader();
        reader.onload = () => {
          this.previewUrl = reader.result;
        };
        reader.readAsDataURL(file);
        console.log('Vista previa de la imagen lista');
      } else {
        this.fileError = 'Por favor, selecciona un archivo con formato .jpg, .jpeg o .png';
        this.selectedFile = null;
        this.previewUrl = null;
        console.error('Formato de archivo inválido:', file.type);
      }
    }
  }

  // Método para enviar el formulario
  onSubmit() {
    console.log('Botón de enviar presionado.');

    if (this.isSubmitting) {
      console.log('La solicitud ya está en proceso. Ignorando el clic.');
      return;
    }

    if (this.courseForm.valid && this.selectedFile && this.userId !== null) {
      // Validación adicional para verificar categoría
      if (!this.courseForm.value.Categoria_id_categoria) {
        console.error('No se ha seleccionado una categoría válida');
        this.snackBar.open('Por favor, selecciona una categoría válida.', 'Cerrar', {
          duration: 3000
        });
        return;
      }

      // Convertir el valor de Categoria_id_categoria a número antes de enviar el FormData
      const categoriaId = Number(this.courseForm.value.Categoria_id_categoria);

      // Construir el FormData con los datos del curso
      const formData = new FormData();
      formData.append('nombre', this.courseForm.value.nombre);
      formData.append('descripcion', this.courseForm.value.descripcion);
      formData.append('dificultad', this.courseForm.value.dificultad);
      formData.append('estado', this.courseForm.value.estado.toString());
      formData.append('categoriaId', categoriaId.toString()); // Asegúrate de que se esté enviando como string de un número válido
      formData.append('usuarioCreadorId', this.userId.toString());

      if (this.selectedFile) {
        formData.append('portada', this.selectedFile, this.selectedFile.name);
      }

      // Mostrar los valores de FormData para depurar
      formData.forEach((value, key) => {
        console.log(`FormData - ${key}:`, value);
      });

      this.isSubmitting = true;

      // Llamar al servicio para crear el curso
      this.cursoService.createCurso(formData).subscribe({
        next: (response) => {
          console.log('Respuesta del servicio:', response);
          this.snackBarRef = this.snackBar.open('¡El curso se ha creado exitosamente!', 'Cerrar', {
            duration: 3000
          });
          setTimeout(() => {
            this.router.navigate(['/my-courses']); // Redirigir a la lista de cursos
          }, 500);
        },
        error: (error) => {
          console.error('Error al crear el curso:', error);
          this.snackBar.open('Error al crear el curso. Por favor, revisa los campos.', 'Cerrar', {
            duration: 3000
          });
          this.isSubmitting = false;
        },
      });
    } else {
      console.error('Formulario no válido o falta información.');
      console.log('Datos actuales del formulario:', this.courseForm.value);
      console.log('ID del usuario actual:', this.userId);
      console.log('Archivo seleccionado:', this.selectedFile);
    }
  }

  // Método para cancelar la creación del curso y redirigir
  onCancel() {
    this.router.navigate(['/my-courses']);
  }

  // Obtener mensaje de error para un campo específico
  getErrorMessage(field: string): string {
    if (this.courseForm.get(field)?.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (this.courseForm.get(field)?.hasError('maxlength')) {
      return `Máximo ${this.courseForm.get(field)?.errors?.['maxlength'].requiredLength} caracteres permitidos.`;
    }
    return '';
  }
}
