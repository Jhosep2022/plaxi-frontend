import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TemaDto } from 'src/app/models/TemaDto';
import { TemaService } from 'src/app/services/tema.service';

@Component({
  selector: 'app-tema-details',
  templateUrl: './tema-details.component.html',
  styleUrls: ['./tema-details.component.css']
})
export class TemaDetailsComponent implements OnInit {
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
    this.router.navigate(['/my-courses']);
  }
}
