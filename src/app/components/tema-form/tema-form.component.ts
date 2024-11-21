import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LeccionService } from '../../services/leccion.service';
import { TemaService } from '../../services/tema.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { LeccionDto } from 'src/app/models/LeccionDto';
import { TemaDto } from 'src/app/models/TemaDto';

@Component({
  selector: 'app-tema-form',
  templateUrl: './tema-form.component.html',
  styleUrls: ['./tema-form.component.css']
})
export class TemaFormComponent implements OnInit, AfterViewChecked {
  leccion: LeccionDto | null = null;
  isEnrolled: boolean = false;
  userId: number | null = null;
  temaForm!: FormGroup;
  selectedFile: File | null = null; // Archivo seleccionado
  fileError: string | null = null; // Error relacionado con el archivo
  previewUrl: string | ArrayBuffer | null = null; // URL de vista previa de la imagen
  snackBarRef: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private temaService: TemaService,
    private leccionService: LeccionService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Inicializar el formulario con validaciones
    this.temaForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(250)]],
      orden: [1, Validators.required],
      estado: [true, Validators.required]
    });

    // Obtener el ID del usuario logueado directamente desde localStorage
    const storedUserId = localStorage.getItem('idUsuario');
    if (storedUserId) {
      this.userId = Number(storedUserId);
      console.log('User ID cargado desde localStorage:', this.userId);
    } else {
      console.error('Error: No se encontró el ID del usuario logueado en localStorage.');
      this.snackBar.open('Error al cargar el ID del usuario. Por favor, inicie sesión nuevamente.', 'Cerrar', {
        duration: 3000
      });
      return;
    }

    // Obtener el ID del curso de la URL
    const leccionId = Number(this.route.snapshot.paramMap.get('id'));
    if (leccionId) {
      // Cargar los detalles del curso usando el servicio
      this.loadLeccionDetails(leccionId);
    }
  }

  ngAfterViewChecked(): void {
    console.log('ngAfterViewChecked ejecutado' ); 
    if (this.snackBarRef) {
      this.snackBarRef.instance.snackBarContainer.nativeElement.style.bottom = '0';
    }
  }

  // Método para cargar los detalles del curso desde la API
  loadLeccionDetails(leccionId: number): void {
    this.leccionService.getLeccionById(leccionId).subscribe({
      next: (data) => {
        this.leccion = data;
        console.log('Detalles de la lección cargados:', this.leccion);
      },
      error: (error) => {
        console.error('Error al cargar los detalles de la lección:', error);
      }
    });
  }

  // Evento cuando se selecciona un archivo
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    console.log('Archivo seleccionado:', file);
  
    if (file) {
      const validExtensions = [
        'image/jpeg', 'image/png', 'image/jpg', // Imágenes
        'video/mp4',                           // Videos
        'application/pdf'                      // PDFs
      ];
  
      if (validExtensions.includes(file.type)) {
        this.selectedFile = file;
        this.fileError = null;
  
        const reader = new FileReader();
  
        // Verificar si el archivo es una imagen para mostrar la vista previa
        if (file.type.startsWith('image/')) {
          reader.onload = () => {
            this.previewUrl = reader.result; // Mostrar vista previa de la imagen
          };
          reader.readAsDataURL(file);
          console.log('Vista previa de la imagen lista');
        } else if (file.type === 'application/pdf') {
          // Puedes agregar una lógica para manejar vistas previas de PDF si es necesario
          this.previewUrl = null;
          console.log('Archivo PDF seleccionado');
        } else if (file.type.startsWith('video/')) {
          // Para videos, se puede reproducir directamente o manejar como se prefiera
          this.previewUrl = null; 
          console.log('Archivo de video seleccionado');
        }
      } else {
        this.fileError = 'Por favor, selecciona un archivo con formato .jpg, .jpeg, .png, .mp4 o .pdf';
        this.selectedFile = null;
        this.previewUrl = null;
        console.error('Formato de archivo inválido:', file.type);
      }
    }
  }

  onSubmit() {
    console.log('Botón de enviar presionado.');
  
    const leccionId = Number(this.route.snapshot.paramMap.get('id'));
  
    if (this.temaForm.valid && this.selectedFile) {
      // Construir el objeto TemaDto
      const temaDto: TemaDto = {
        idTema: 0, 
        titulo: this.temaForm.value.titulo,
        orden: this.temaForm.value.orden,
        descripcion: this.temaForm.value.descripcion,
        recursoMultimedia: '', 
        estado: this.temaForm.value.estado, 
        leccionId: leccionId,
      };
  
      // Mostrar los valores de TemaDto para depurar
      console.log('Datos de TemaDto:', temaDto);
  
      // Llamar al servicio para crear el tema
      this.temaService.createTema(temaDto, this.selectedFile).subscribe({
        next: (response) => {
          console.log('Respuesta del servicio:', response);
          this.snackBarRef = this.snackBar.open('¡El tema se ha creado exitosamente!', 'Cerrar', {
            duration: 3000
          });
          setTimeout(() => {
            this.router.navigate(['/my-courses']); // Redirigir a la lista de cursos
          }, 500);
        },
        error: (error) => {
          console.error('Error al crear el tema:', error);
          this.snackBarRef = this.snackBar.open('Error al crear el tema. Por favor, revisa los campos.', 'Cerrar', {
            duration: 3000
          });
        },
      });
    } else {
      console.error('Formulario no válido o falta información.');
      console.log('Datos actuales del formulario:', this.temaForm.value);
      console.log('Archivo seleccionado:', this.selectedFile);
    }
  }

  // Método para cancelar la creación de la lección y redirigir
  onCancel() {
    const leccionId = Number(this.route.snapshot.paramMap.get('id'));

    if (leccionId) {
      this.router.navigate([`/leccion-details/${leccionId}`]); // Redirige a la leccion con el ID correcto
    } else {
      console.error('No se encontró el ID de la lección para redirigir.');
    }
  }

  // Obtener mensaje de error para un campo específico
  getErrorMessage(field: string): string {
    if (this.temaForm.get(field)?.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (this.temaForm.get(field)?.hasError('maxlength')) {
      return `Máximo ${this.temaForm.get(field)?.errors?.['maxlength'].requiredLength} caracteres permitidos.`;
    }
    return '';
  }
}
