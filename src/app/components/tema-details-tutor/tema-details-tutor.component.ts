import { Component, OnInit, inject, signal, input, numberAttribute } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TemaDto } from 'src/app/models/TemaDto';
import { TemaService } from 'src/app/services/tema.service';
import { SessionService } from '../../core/auth/session.service';

@Component({
    selector: 'app-tema-details-tutor',
    templateUrl: './tema-details-tutor.component.html',
    styleUrls: ['./tema-details-tutor.component.css'],
    imports: [RouterLink]
})
export class TemaDetailsTutorComponent implements OnInit {
  protected readonly session = inject(SessionService);
  readonly cursoId = input.required({ transform: numberAttribute });
  readonly leccionId = input.required({ transform: numberAttribute });
  readonly temaId = input.required({ transform: numberAttribute });
  private router = inject(Router);
  private temaService = inject(TemaService);
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  readonly tema = signal<TemaDto | null>(null);
  readonly sanitizedUrl = signal<SafeResourceUrl | null>(null);
  userId: number | null = null;

  ngOnInit(): void {
    const temaId = this.temaId();
    if (temaId) {
      this.loadTemaDetails(temaId);
    }
  }

  // Método para cargar los detalles del tema
  loadTemaDetails(temaId: number): void {
    this.temaService.getTemaById(temaId).subscribe({
      next: (data: TemaDto) => {
        this.tema.set(data);
        console.log('Tema cargado:', this.tema());
        console.log('Recurso Multimedia:', this.tema()?.recursoMultimedia);
        if (this.tema()?.recursoMultimedia) {
          this.sanitizedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(data.recursoMultimedia));
          console.log('URL sanitizada:', this.sanitizedUrl());
        }
      },
      error: (error) => console.error('Error al cargar los detalles del tema:', error),
    });
  }

  // Lógica para volver a la lista de cursos
  goBack(): void {
    this.router.navigate(this.session.rutaRol('contenido', 'cursos', this.cursoId(), 'lecciones', this.leccionId()));
  }

  deleteTema() {
    if (confirm(`¿Estás seguro de que deseas eliminar el tema: ${this.tema()?.titulo}?`)) {
      this.temaService.deleteTema(this.tema()?.idTema!).subscribe({
        next: () => console.log('Tema eliminado exitosamente'),
        error: (error) => console.error('Error al eliminar el te,a:', error)
      });

      console.log(`Tema con ID ${this.tema()?.idTema} eliminado`);
      this.snackBar.open('Tema eliminado exitosamente', 'Cerrar', {
        duration: 3000
      });
      this.router.navigate(this.session.rutaRol('contenido', 'cursos', this.cursoId(), 'lecciones', this.leccionId()));
    }
  }
}
