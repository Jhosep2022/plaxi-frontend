import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  EstadoAsistencia,
  EstadoLicencia,
  Estudiante,
  Licencia,
  RegistroAsistencia,
  TOLERANCIA_POR_DEFECTO,
} from '../core/models/asistencia.model';
import { hoyIso } from '../core/utils/asistencia';
import { MOCK_CONFIG_ASISTENCIA, MOCK_ESTUDIANTES, MOCK_LICENCIAS, MOCK_REGISTROS } from '../mocks/asistencia.mock';
import { RepositorioMock } from './repositorio-mock';

export interface MarcaAsistencia {
  estudianteId: number;
  estado: EstadoAsistencia;
  minutosTarde: number;
}

export interface ClaseDelDia {
  espacioId: number;
  paraleloId: number;
  materiaId: number;
  bloque: number;
  fecha: string;
  docenteId: number;
}

// Asistencia de estudiantes por clase, licencias y tolerancia de atraso.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP.
@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private estudiantesRepo = new RepositorioMock<Estudiante>(MOCK_ESTUDIANTES);
  private registrosRepo = new RepositorioMock<RegistroAsistencia>(MOCK_REGISTROS);
  private licenciasRepo = new RepositorioMock<Licencia>(MOCK_LICENCIAS);
  private configRepo = new RepositorioMock(MOCK_CONFIG_ASISTENCIA);

  // ---------- Estudiantes ----------
  estudiantes(): Observable<Estudiante[]> {
    return this.estudiantesRepo.listar();
  }

  estudiantesDeParalelo(paraleloId: number): Observable<Estudiante[]> {
    return this.estudiantesRepo.listar((e) => e.paraleloId === paraleloId);
  }

  // ---------- Registros ----------
  registrosDeClase(clase: Omit<ClaseDelDia, 'docenteId' | 'espacioId'>): Observable<RegistroAsistencia[]> {
    return this.registrosRepo.listar((r) =>
      r.paraleloId === clase.paraleloId && r.materiaId === clase.materiaId && r.bloque === clase.bloque && r.fecha === clase.fecha);
  }

  registrosDeEstudiante(estudianteId: number): Observable<RegistroAsistencia[]> {
    return this.registrosRepo.listar((r) => r.estudianteId === estudianteId).pipe(map((rs) => rs.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.bloque - b.bloque)));
  }

  registrosEntre(espacioId: number, desde: string, hasta: string): Observable<RegistroAsistencia[]> {
    return this.registrosRepo.listar((r) => r.espacioId === espacioId && r.fecha >= desde && r.fecha <= hasta);
  }

  // Guarda la asistencia de una clase (reemplaza la que ya se haya tomado ese día)
  guardarAsistencia(clase: ClaseDelDia, marcas: MarcaAsistencia[]): Observable<number> {
    if (clase.fecha > hoyIso()) return throwError(() => new Error('No se puede tomar asistencia de una fecha futura.'));
    const existentes = this.registrosRepo.ahora((r) =>
      r.paraleloId === clase.paraleloId && r.materiaId === clase.materiaId && r.bloque === clase.bloque && r.fecha === clase.fecha);
    for (const marca of marcas) {
      const previo = existentes.find((r) => r.estudianteId === marca.estudianteId);
      this.registrosRepo.guardar({
        ...clase,
        id: previo?.id,
        estudianteId: marca.estudianteId,
        estado: marca.estado,
        minutosTarde: marca.estado === 'atraso' ? marca.minutosTarde : 0,
      }).subscribe();
    }
    return this.registrosRepo.listar(() => false).pipe(map(() => marcas.length));
  }

  // ---------- Tolerancia de atraso ----------
  tolerancia(docenteId: number): Observable<number> {
    return this.configRepo.listar((c) => c.id === docenteId).pipe(map(([c]) => c?.toleranciaMin ?? TOLERANCIA_POR_DEFECTO));
  }

  guardarTolerancia(docenteId: number, toleranciaMin: number): Observable<number> {
    if (toleranciaMin < 0 || toleranciaMin > 60) return throwError(() => new Error('La tolerancia debe estar entre 0 y 60 minutos.'));
    return this.configRepo.guardar({ id: docenteId, toleranciaMin }).pipe(map((c) => c.toleranciaMin));
  }

  // ---------- Licencias ----------
  licencias(espacioId: number): Observable<Licencia[]> {
    return this.licenciasRepo.listar((l) => l.espacioId === espacioId).pipe(map((ls) => ls.sort((a, b) => b.creada.localeCompare(a.creada) || b.id - a.id)));
  }

  licenciasDeEstudiante(estudianteId: number): Observable<Licencia[]> {
    return this.licenciasRepo.listar((l) => l.estudianteId === estudianteId).pipe(map((ls) => ls.sort((a, b) => b.desde.localeCompare(a.desde))));
  }

  solicitarLicencia(licencia: Omit<Licencia, 'id' | 'estado' | 'respuesta' | 'creada'>): Observable<Licencia> {
    if (licencia.hasta < licencia.desde) return throwError(() => new Error('La fecha de fin no puede ser anterior a la de inicio.'));
    const cruzada = this.licenciasRepo.ahora((l) => l.estudianteId === licencia.estudianteId && l.estado !== 'rechazada' && l.desde <= licencia.hasta && licencia.desde <= l.hasta);
    if (cruzada.length) return throwError(() => new Error('Ya hay una licencia solicitada o aprobada para esas fechas.'));
    return this.licenciasRepo.guardar({ ...licencia, estado: 'pendiente', respuesta: '', creada: hoyIso() });
  }

  // Aprueba o rechaza; al aprobar, la asistencia ya tomada en esas fechas pasa a "licencia"
  responderLicencia(licencia: Licencia, estado: Exclude<EstadoLicencia, 'pendiente'>, respuesta: string): Observable<Licencia> {
    if (estado === 'aprobada') {
      for (const r of this.registrosRepo.ahora((r) => r.estudianteId === licencia.estudianteId && r.fecha >= licencia.desde && r.fecha <= licencia.hasta)) {
        r.estado = 'licencia';
        r.minutosTarde = 0;
      }
    }
    return this.licenciasRepo.guardar({ ...licencia, estado, respuesta });
  }
}
