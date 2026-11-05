import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Membership } from '../core/models/space.model';
import { ResumenData } from '../shared/dashboard/dashboard.models';
import { AcademySummaryService } from './academy-summary.service';
import { SchoolSummaryService } from './school-summary.service';

// Arma los datos del Resumen (Inicio) según el tipo de espacio: colegio o academia.
// Los widgets son los mismos para todos; cada servicio los llena con los datos de sus módulos.
@Injectable({ providedIn: 'root' })
export class OverviewService {
  private colegio = inject(SchoolSummaryService);
  private academia = inject(AcademySummaryService);

  obtener(membresia: Membership, usuarioId: number): Observable<ResumenData> {
    return membresia.espacio.tipo === 'colegio' ? this.colegio.obtener(membresia, usuarioId) : this.academia.obtener(membresia, usuarioId);
  }
}
