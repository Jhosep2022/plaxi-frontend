import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { Turno } from '../core/models/academico.model';
import { HorarioLaboral, Marcacion, PuntoMarcacion, TipoMarcacion } from '../core/models/marcacion.model';
import { diaDeSemana, hoyIso } from '../core/utils/asistencia';
import { docenteDe, rangoDeBloque } from '../core/utils/horario';
import { aHora, aMinutos } from '../core/utils/jornada';
import { codigoDeVentana, distanciaLabel, distanciaMetros, ventanaActual } from '../core/utils/marcacion';
import { MOCK_ASIGNACIONES, MOCK_CLASES, MOCK_JORNADAS, MOCK_PARALELOS } from '../mocks/academico.mock';
import { MOCK_HORARIOS_LABORALES, MOCK_MARCACIONES, MOCK_PUNTOS_MARCACION } from '../mocks/marcacion.mock';
import { RepositorioMock } from './repositorio-mock';

export interface SolicitudMarcacion {
  espacioId: number;
  docenteId: number;
  tipo: TipoMarcacion;
  puntoId: number;
  codigo: string;
  latitud: number;
  longitud: number;
}

// Turno y horario esperado de un docente en un día (según sus clases y el horario laboral)
export interface Esperado {
  turno: Turno;
  entrada: string;
  salida: string;
  primeraClase: string;
}

// Marcación del personal con QR rotativo + validación GPS, puntos de marcación y horario laboral.
// MOCK: todo vive en memoria; en producción la validación del código y la ubicación la hace el servidor.
@Injectable({ providedIn: 'root' })
export class MarcacionService {
  private puntosRepo = new RepositorioMock<PuntoMarcacion>(MOCK_PUNTOS_MARCACION);
  private horariosRepo = new RepositorioMock<HorarioLaboral>(MOCK_HORARIOS_LABORALES);
  private marcacionesRepo = new RepositorioMock<Marcacion>(MOCK_MARCACIONES);

  // ---------- Puntos de marcación ----------
  puntos(espacioId: number): Observable<PuntoMarcacion[]> {
    return this.puntosRepo.listar((p) => p.espacioId === espacioId);
  }

  guardarPunto(punto: Omit<PuntoMarcacion, 'id' | 'secreto'> & { id?: number }): Observable<PuntoMarcacion> {
    const previo = this.puntosRepo.ahora((p) => p.id === punto.id)[0];
    const secreto = previo?.secreto ?? `punto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return this.puntosRepo.guardar({ ...punto, secreto });
  }

  eliminarPunto(id: number): Observable<void> {
    return this.puntosRepo.eliminar(id);
  }

  // Código vigente de un punto (lo muestra la pantalla de marcación)
  codigoVigente(punto: PuntoMarcacion): string {
    return codigoDeVentana(punto.secreto, ventanaActual());
  }

  // ---------- Horario laboral ----------
  horarioLaboral(espacioId: number): Observable<HorarioLaboral> {
    return this.horariosRepo.listar((h) => h.id === espacioId).pipe(
      map(([h]) => h ?? { id: espacioId, toleranciaMin: 10, turnos: [{ turno: 'manana', entrada: '07:15', salida: '14:00' }] })
    );
  }

  guardarHorarioLaboral(horario: HorarioLaboral): Observable<HorarioLaboral> {
    const invalido = horario.turnos.find((t) => aMinutos(t.salida) <= aMinutos(t.entrada));
    if (invalido) return throwError(() => new Error('La salida debe ser posterior a la entrada en cada turno.'));
    return this.horariosRepo.guardar(horario);
  }

  // Turno y horario esperado de un docente en una fecha (null si ese día no tiene clases)
  esperado(espacioId: number, docenteId: number, fecha: string): Esperado | null {
    const jornada = MOCK_JORNADAS.find((j) => j.espacioId === espacioId);
    const horario = this.horariosRepo.ahora((h) => h.id === espacioId)[0];
    if (!jornada || !horario) return null;
    const ctx = { jornada, paralelos: MOCK_PARALELOS, asignaciones: MOCK_ASIGNACIONES, clases: MOCK_CLASES };
    const clases = MOCK_CLASES
      .filter((c) => c.dia === diaDeSemana(fecha) && docenteDe(MOCK_ASIGNACIONES, c.paraleloId, c.materiaId) === docenteId)
      .map((c) => ({ clase: c, rango: rangoDeBloque(ctx, c.paraleloId, c.bloque) }))
      .filter((x) => x.rango)
      .sort((a, b) => a.rango!.inicio.localeCompare(b.rango!.inicio));
    if (!clases.length) return null;
    const turno = MOCK_PARALELOS.find((p) => p.id === clases[0].clase.paraleloId)?.turno ?? 'manana';
    const laboral = horario.turnos.find((t) => t.turno === turno) ?? horario.turnos[0];
    return { turno, entrada: laboral.entrada, salida: laboral.salida, primeraClase: clases[0].rango!.inicio };
  }

  // Docentes que deben marcar en una fecha (los que tienen clases ese día)
  docentesEsperados(espacioId: number, fecha: string): { docenteId: number; esperado: Esperado }[] {
    const ids = [...new Set(MOCK_CLASES.map((c) => docenteDe(MOCK_ASIGNACIONES, c.paraleloId, c.materiaId)))].filter(Boolean);
    return ids.flatMap((docenteId) => {
      const esperado = this.esperado(espacioId, docenteId, fecha);
      return esperado ? [{ docenteId, esperado }] : [];
    });
  }

  // ---------- Marcaciones ----------
  marcacionesDe(docenteId: number): Observable<Marcacion[]> {
    return this.marcacionesRepo.listar((m) => m.docenteId === docenteId).pipe(
      map((ms) => ms.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.hora.localeCompare(b.hora)))
    );
  }

  marcacionesDelDia(espacioId: number, fecha: string): Observable<Marcacion[]> {
    return this.marcacionesRepo.listar((m) => m.espacioId === espacioId && m.fecha === fecha);
  }

  marcacionesEntre(espacioId: number, desde: string, hasta: string): Observable<Marcacion[]> {
    return this.marcacionesRepo.listar((m) => m.espacioId === espacioId && m.fecha >= desde && m.fecha <= hasta);
  }

  // Registra una entrada o salida validando punto, ubicación, código y secuencia
  marcar(s: SolicitudMarcacion): Observable<Marcacion> {
    const fallo = (mensaje: string) => throwError(() => new Error(mensaje));
    const punto = this.puntosRepo.ahora((p) => p.id === s.puntoId && p.espacioId === s.espacioId)[0];
    if (!punto || !punto.activo) return fallo('El punto de marcación no existe o está desactivado.');

    const distancia = distanciaMetros(punto, s);
    if (distancia > punto.radioM) {
      return fallo(`Estás a ${distanciaLabel(distancia)} de ${punto.nombre}. Debes estar a menos de ${punto.radioM} m para marcar.`);
    }

    const ventana = ventanaActual();
    const validos = [codigoDeVentana(punto.secreto, ventana), codigoDeVentana(punto.secreto, ventana - 1)];
    if (!validos.includes(s.codigo)) return fallo('El código no es válido o ya venció. Escanea el QR que está en pantalla ahora.');

    const fecha = hoyIso();
    const delDia = this.marcacionesRepo.ahora((m) => m.docenteId === s.docenteId && m.fecha === fecha);
    if (s.tipo === 'entrada' && delDia.some((m) => m.tipo === 'entrada')) return fallo('Ya registraste tu entrada hoy.');
    if (s.tipo === 'salida' && !delDia.some((m) => m.tipo === 'entrada')) return fallo('Primero debes registrar tu entrada.');
    if (s.tipo === 'salida' && delDia.some((m) => m.tipo === 'salida')) return fallo('Ya registraste tu salida hoy.');

    const ahora = new Date();
    const hora = aHora(ahora.getHours() * 60 + ahora.getMinutes());
    const esperado = this.esperado(s.espacioId, s.docenteId, fecha);
    const tolerancia = this.horariosRepo.ahora((h) => h.id === s.espacioId)[0]?.toleranciaMin ?? 10;
    let estado: Marcacion['estado'] = s.tipo === 'entrada' ? 'a-tiempo' : 'salida';
    let minutos = 0;
    if (esperado && s.tipo === 'entrada') {
      minutos = Math.max(0, aMinutos(hora) - aMinutos(esperado.entrada));
      estado = minutos > tolerancia ? 'atraso' : 'a-tiempo';
    } else if (esperado && s.tipo === 'salida' && aMinutos(hora) < aMinutos(esperado.salida)) {
      minutos = aMinutos(esperado.salida) - aMinutos(hora);
      estado = 'salida-anticipada';
    }

    return this.marcacionesRepo.guardar({
      espacioId: s.espacioId, docenteId: s.docenteId, fecha, hora, tipo: s.tipo, estado, minutos, puntoId: punto.id, distanciaM: distancia,
    });
  }
}
