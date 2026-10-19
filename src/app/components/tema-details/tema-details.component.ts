import { Component, OnInit, inject, signal, input, numberAttribute } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TemaDto } from 'src/app/models/TemaDto';
import { TemaService } from 'src/app/services/tema.service';
import { SessionService } from '../../core/auth/session.service';

@Component({
    selector: 'app-tema-details',
    templateUrl: './tema-details.component.html',
    styleUrls: ['./tema-details.component.css'],
})
export class TemaDetailsComponent implements OnInit {
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
    this.router.navigate(this.session.rutaRol('cursos', this.cursoId(), 'lecciones', this.leccionId()));
  }
}
