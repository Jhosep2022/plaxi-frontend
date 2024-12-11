import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TemaDto } from 'src/app/models/TemaDto';
import { TemaService } from 'src/app/services/tema.service';

@Component({
  selector: 'app-tema-details-tutor',
  templateUrl: './tema-details-tutor.component.html',
  styleUrls: ['./tema-details-tutor.component.css']
})
export class TemaDetailsTutorComponent implements OnInit {
  tema: TemaDto | null = null;
  sanitizedUrl: SafeResourceUrl | null = null;
  userId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private temaService: TemaService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const temaId = Number(this.route.snapshot.paramMap.get('id'));
    if (temaId) {
      this.loadTemaDetails(temaId);
    }
  }

  // Método para cargar los detalles del tema
  loadTemaDetails(temaId: number): void {
    this.temaService.getTemaById(temaId).subscribe({
      next: (data: TemaDto) => {
        this.tema = data;
        console.log('Tema cargado:', this.tema);
        console.log('Recurso Multimedia:', this.tema?.recursoMultimedia);
        if (this.tema?.recursoMultimedia) {
          this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.tema.recursoMultimedia);
          console.log('URL sanitizada:', this.sanitizedUrl);
        }
      },
      error: (error) => console.error('Error al cargar los detalles del tema:', error),
    });
  }

  // Lógica para volver a la lista de cursos
  goBack(): void {
    if (this.tema?.leccionId) {
      this.router.navigate([`/lesson-details-tutor/${this.tema.leccionId}`]);
    } else {
      // Fallback if no leccionId is found
      console.error('No se encontró leccionId para el tema.');
      // Optional: Navigate to a default page or show an error.
    }  }

  deleteTema() {
    if (confirm(`¿Estás seguro de que deseas eliminar el tema: ${this.tema?.titulo}?`)) {
      this.temaService.deleteTema(this.tema?.idTema!).subscribe({
        next: () => console.log('Tema eliminado exitosamente'),
        error: (error) => console.error('Error al eliminar el te,a:', error)
      });

      console.log(`Tema con ID ${this.tema?.idTema} eliminado`);
      this.snackBar.open('Tema eliminado exitosamente', 'Cerrar', {
        duration: 3000
      });
      this.router.navigate(['/my-courses']);
    }
  }
}
