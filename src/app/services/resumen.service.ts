import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Membresia } from '../core/models/espacio.model';
import { ResumenData } from '../shared/dashboard/dashboard.models';
import { ResumenAcademiaService } from './resumen-academia.service';
import { ResumenColegioService } from './resumen-colegio.service';

// Arma los datos del Resumen (Inicio) según el tipo de espacio: colegio o academia.
// Los widgets son los mismos para todos; cada servicio los llena con los datos de sus módulos.
@Injectable({ providedIn: 'root' })
export class ResumenService {
  private colegio = inject(ResumenColegioService);
  private academia = inject(ResumenAcademiaService);

  obtener(membresia: Membresia, usuarioId: number): Observable<ResumenData> {
    return membresia.espacio.tipo === 'colegio' ? this.colegio.obtener(membresia, usuarioId) : this.academia.obtener(membresia, usuarioId);
  }
}
