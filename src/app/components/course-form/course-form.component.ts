import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-course-form',
  templateUrl: './course-form.component.html',
  styleUrls: ['./course-form.component.css']
})
export class CourseFormComponent implements OnInit {
  courseForm!: FormGroup;

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    // Inicializar el formulario con validaciones
    this.courseForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(150)]],
      descripcion: ['', [Validators.maxLength(250)]],
      portada: ['', [Validators.required, Validators.pattern('(https?://.*\.(?:png|jpg))')]],
      dificultad: ['Beginner', Validators.required],
      estado: [true, Validators.required],
      Categoria_id_categoria: [0, [Validators.required, Validators.min(1)]],
    });
  }

  onSubmit() {
    if (this.courseForm.valid) {
      console.log('Course Created:', this.courseForm.value);
      // Aquí va la lógica para cerrar el modal y mostrar los cursos actualizados
      this.router.navigate(['/my-courses']);
    } else {
      // Marcar todos los campos como tocados para mostrar mensajes de error
      this.courseForm.markAllAsTouched();
    }
  }

  onCancel() {
    // Redirigir a la lista de cursos cuando se presione "Cancelar"
    this.router.navigate(['/my-courses']);
  }

  // Método para verificar si un campo tiene errores y mostrar el mensaje
  getErrorMessage(field: string): string {
    if (this.courseForm.get(field)?.hasError('required')) {
      return 'Este campo es obligatorio.';
    }
    if (this.courseForm.get(field)?.hasError('maxlength')) {
      return `Máximo ${this.courseForm.get(field)?.errors?.['maxlength'].requiredLength} caracteres permitidos.`;
    }
    if (this.courseForm.get(field)?.hasError('min')) {
      return 'El valor debe ser mayor que cero.';
    }
    if (this.courseForm.get(field)?.hasError('pattern')) {
      return 'La URL debe ser válida y terminar en .png o .jpg';
    }
    return '';
  }
}
