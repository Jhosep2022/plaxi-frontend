import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { delay, map, switchMap } from 'rxjs/operators';
import type { Membresia } from '../core/models/espacio.model';
import type { ContactoEmergencia, EnlacesPerfil, EspacioDelPerfil, IndicadorPerfil, Perfil, PreferenciasNotificacion } from '../core/models/perfil.model';
import { FOTO_MAX_KB } from '../core/models/perfil.model';
import { hoyIso } from '../core/utils/asistencia';
import { claveValida } from '../core/utils/clave';
import { porcentaje } from '../core/utils/reportes';
import { MOCK_CLAVES } from '../mocks/auth.mock';
import { MOCK_AULAS_VIRTUALES } from '../mocks/aulas.mock';
import { MOCK_DELAY, MOCK_ESPACIOS, MOCK_INSCRIPCIONES, MOCK_MEMBRESIAS, MOCK_PERFILES } from '../mocks/mock-data';
import { MOCK_MIEMBRO_DESDE, MOCK_PERFIL_EXTRA, perfilExtraVacio } from '../mocks/perfil.mock';
import { AcademiaService } from './academia.service';
import { AcademicoService } from './academico.service';
import { AsistenciaService } from './asistencia.service';
import { AulasService } from './aulas.service';
import { MarcacionService } from './marcacion.service';
import { PersonasService } from './personas.service';
import { SesionesService } from './sesiones.service';
import { TareasService } from './tareas.service';

export interface DatosPersonales {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  ci: string;
  fechaNacimiento: string;
}

export interface DatosContacto {
  gmail: string;
  telefono: string;
  direccion: string;
}

export interface DatosDocente {
  especialidad: string;
  bio: string;
  enlaces: EnlacesPerfil;
}

export const PATRON_USUARIO = /^[a-z0-9._]{3,20}$/;
export const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PATRON_CELULAR = /^[67]\d{7}$/;
export const PATRON_ENLACE = /^https?:\/\/\S+\.\S+/;

// Perfil del usuario que inició sesión: datos personales, foto, espacios, seguridad y preferencias.
// MOCK: todo vive en memoria; cuando exista el backend, cada método será una llamada HTTP a /perfil.
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private aulas = inject(AulasService);
  private academia = inject(AcademiaService);
  private academico = inject(AcademicoService);
  private asistencia = inject(AsistenciaService);
  private marcacion = inject(MarcacionService);
  private personas = inject(PersonasService);
  private sesiones = inject(SesionesService);
  private tareas = inject(TareasService);

  // Sube cada vez que cambia el nombre o la foto (el sidebar se vuelve a cargar)
  readonly version = signal(0);

  perfil(usuarioId: number): Observable<Perfil | null> {
    const dto = MOCK_PERFILES.find((p) => p.idUsuario === usuarioId);
    return of(dto ? structuredClone({ ...dto, ...this.extra(usuarioId) }) : null).pipe(delay(MOCK_DELAY));
  }

  // ---------- Datos personales ----------
  guardarPersonales(usuarioId: number, datos: DatosPersonales): Observable<Perfil | null> {
    if (!datos.nombre.trim() || !datos.primerApellido.trim()) return throwError(() => new Error('El nombre y el primer apellido son obligatorios.'));
    if (datos.fechaNacimiento && datos.fechaNacimiento > hoyIso()) return throwError(() => new Error('La fecha de nacimiento no puede ser futura.'));
    return this.actualizar(usuarioId, (dto, extra) => {
      dto.nombre = datos.nombre.trim();
      dto.primerApellido = datos.primerApellido.trim();
      dto.segundoApellido = datos.segundoApellido.trim();
      dto.ci = datos.ci.trim();
      extra.fechaNacimiento = datos.fechaNacimiento;
    });
  }

  guardarContacto(usuarioId: number, datos: DatosContacto): Observable<Perfil | null> {
    const correo = datos.gmail.trim().toLowerCase();
    if (!PATRON_CORREO.test(correo)) return throwError(() => new Error('Escribe un correo válido.'));
    if (MOCK_PERFILES.some((p) => p.gmail === correo && p.idUsuario !== usuarioId)) return throwError(() => new Error('Ese correo ya lo usa otra cuenta.'));
    if (datos.telefono && !PATRON_CELULAR.test(datos.telefono)) return throwError(() => new Error('El celular debe tener 8 dígitos y empezar con 6 o 7.'));
    return this.actualizar(usuarioId, (dto, extra) => {
      dto.gmail = correo;
      dto.telefono = datos.telefono.trim();
      extra.direccion = datos.direccion.trim();
    });
  }

  guardarUsuario(usuarioId: number, username: string): Observable<Perfil | null> {
    const nombre = username.trim().toLowerCase();
    if (!PATRON_USUARIO.test(nombre)) return throwError(() => new Error('De 3 a 20 caracteres: letras, números, punto o guion bajo.'));
    if (MOCK_PERFILES.some((p) => p.username === nombre && p.idUsuario !== usuarioId)) return throwError(() => new Error('Ese nombre de usuario ya está ocupado.'));
    return this.actualizar(usuarioId, (dto) => (dto.username = nombre));
  }

  guardarDocente(usuarioId: number, datos: DatosDocente): Observable<Perfil | null> {
    if (datos.bio.length > 400) return throwError(() => new Error('La presentación puede tener hasta 400 caracteres.'));
    const malos = Object.values(datos.enlaces).filter((e) => e && !PATRON_ENLACE.test(e));
    if (malos.length) return throwError(() => new Error('Los enlaces deben empezar con https://'));
    return this.actualizar(usuarioId, (_, extra) => {
      extra.especialidad = datos.especialidad.trim();
      extra.bio = datos.bio.trim();
      extra.enlaces = { ...datos.enlaces };
    });
  }

  guardarEmergencia(usuarioId: number, contacto: ContactoEmergencia): Observable<Perfil | null> {
    if (contacto.telefono && !PATRON_CELULAR.test(contacto.telefono)) return throwError(() => new Error('El celular debe tener 8 dígitos y empezar con 6 o 7.'));
    return this.actualizar(usuarioId, (_, extra) => (extra.contactoEmergencia = { nombre: contacto.nombre.trim(), parentesco: contacto.parentesco.trim(), telefono: contacto.telefono.trim() }));
  }

  // Foto como data URL ('' para quitarla y volver a las iniciales)
  cambiarFoto(usuarioId: number, foto: string): Observable<Perfil | null> {
    if (foto.length > FOTO_MAX_KB * 1024 * 1.37) return throwError(() => new Error(`La foto debe pesar menos de ${FOTO_MAX_KB} KB.`));
    return this.actualizar(usuarioId, (dto) => (dto.imagenUrl = foto || undefined));
  }

  // ---------- Seguridad ----------
  cambiarClave(usuarioId: number, actual: string, nueva: string): Observable<Perfil | null> {
    if (!actual) return throwError(() => new Error('Escribe tu contraseña actual.'));
    if (!claveValida(nueva)) return throwError(() => new Error('La nueva contraseña debe tener al menos 8 caracteres, con letras y números.'));
    if (nueva === actual) return throwError(() => new Error('La nueva contraseña debe ser distinta de la actual.'));
    const guardada = MOCK_CLAVES[usuarioId];
    if (guardada !== undefined && guardada !== actual) return throwError(() => new Error('La contraseña actual no es correcta.'));
    MOCK_CLAVES[usuarioId] = nueva;
    return this.actualizar(usuarioId, (_, extra) => (extra.claveActualizada = hoyIso()));
  }

  cerrarDispositivo(usuarioId: number, dispositivoId: number): Observable<Perfil | null> {
    return this.actualizar(usuarioId, (_, extra) => (extra.dispositivos = extra.dispositivos.filter((d) => d.actual || d.id !== dispositivoId)));
  }

  cerrarOtrosDispositivos(usuarioId: number): Observable<Perfil | null> {
    return this.actualizar(usuarioId, (_, extra) => (extra.dispositivos = extra.dispositivos.filter((d) => d.actual)));
  }

  // Baja lógica: la cuenta queda inactiva y se cierra la sesión
  darDeBaja(usuarioId: number): Observable<void> {
    const dto = MOCK_PERFILES.find((p) => p.idUsuario === usuarioId);
    if (!dto) return throwError(() => new Error('La cuenta ya no existe.'));
    dto.status = false;
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // ---------- Preferencias ----------
  guardarNotificaciones(usuarioId: number, notificaciones: PreferenciasNotificacion): Observable<Perfil | null> {
    return this.actualizar(usuarioId, (_, extra) => (extra.notificaciones = structuredClone(notificaciones)));
  }

  // ---------- Espacios ----------
  espacios(usuarioId: number): Observable<EspacioDelPerfil[]> {
    const lista = MOCK_MEMBRESIAS.filter((m) => m.usuarioId === usuarioId).map((m): EspacioDelPerfil => {
      const espacio = MOCK_ESPACIOS.find((e) => e.id === m.espacioId)!;
      const motivo =
        m.rol === 'direccion' ? 'Administras este espacio.'
        : espacio.tipo === 'academia' && m.rol === 'docente' ? 'Es tu academia.'
        : espacio.tipo === 'colegio' ? 'Para salir del colegio habla con la dirección.'
        : '';
      return { espacioId: espacio.id, slug: espacio.slug, nombre: espacio.nombre, tipo: espacio.tipo, rol: m.rol, desde: MOCK_MIEMBRO_DESDE[`${usuarioId}-${espacio.id}`] ?? '', puedeSalir: !motivo, motivo };
    });
    return of(lista).pipe(delay(MOCK_DELAY));
  }

  // Sale de una academia: se quitan la membresía y sus inscripciones a los cursos
  salirDeEspacio(usuarioId: number, espacioId: number): Observable<void> {
    const i = MOCK_MEMBRESIAS.findIndex((m) => m.usuarioId === usuarioId && m.espacioId === espacioId);
    const espacio = MOCK_ESPACIOS.find((e) => e.id === espacioId);
    if (i < 0 || !espacio) return throwError(() => new Error('Ya no perteneces a este espacio.'));
    if (espacio.tipo !== 'academia' || MOCK_MEMBRESIAS[i].rol !== 'estudiante') return throwError(() => new Error('No puedes salir de este espacio.'));
    MOCK_MEMBRESIAS.splice(i, 1);
    const cursos = new Set(MOCK_AULAS_VIRTUALES.filter((a) => a.espacioId === espacioId && a.tipo === 'curso').map((a) => a.id - 1000));
    for (let j = MOCK_INSCRIPCIONES.length - 1; j >= 0; j--) {
      if (MOCK_INSCRIPCIONES[j].usuarioId === usuarioId && cursos.has(MOCK_INSCRIPCIONES[j].cursoId)) MOCK_INSCRIPCIONES.splice(j, 1);
    }
    return of(undefined).pipe(delay(MOCK_DELAY));
  }

  // ---------- Indicadores de la cabecera (según el rol en el espacio activo) ----------
  indicadores(membresia: Membresia, usuarioId: number): Observable<IndicadorPerfil[]> {
    const espacioId = membresia.espacio.id;
    const colegio = membresia.espacio.tipo === 'colegio';
    switch (membresia.rol) {
      case 'docente':
        return colegio
          ? forkJoin({ aulas: this.aulas.aulasDocente(espacioId, usuarioId), marcas: this.marcacion.marcacionesDe(usuarioId) }).pipe(
              map(({ aulas, marcas }): IndicadorPerfil[] => {
                const entradas = marcas.filter((m) => m.tipo === 'entrada');
                return [
                  { label: 'Clases', valor: String(aulas.length), detalle: 'asignadas esta gestión', tono: 'lima' },
                  { label: 'Estudiantes', valor: String(aulas.reduce((s, a) => s + a.estudiantes, 0)), detalle: 'en todas tus clases', tono: 'azul' },
                  { label: 'Por revisar', valor: String(aulas.reduce((s, a) => s + a.pendientes, 0)), detalle: 'entregas de tareas', tono: 'crema' },
                  { label: 'Puntualidad', valor: entradas.length ? `${porcentaje(entradas.filter((m) => m.estado === 'a-tiempo').length, entradas.length)}%` : '—', detalle: 'entradas a tiempo', tono: 'lima' },
                ];
              })
            )
          : forkJoin({ aulas: this.aulas.aulasDocente(espacioId, usuarioId), estudiantes: this.academia.estudiantes(espacioId, usuarioId), sesiones: this.sesiones.sesionesDocente(espacioId, usuarioId) }).pipe(
              map(({ aulas, estudiantes, sesiones }): IndicadorPerfil[] => [
                { label: 'Cursos', valor: String(aulas.length), detalle: 'publicados y privados', tono: 'lima' },
                { label: 'Estudiantes', valor: String(estudiantes.length), detalle: 'inscritos activos', tono: 'azul' },
                { label: 'Sesiones', valor: String(sesiones.filter((s) => s.estado === 'finalizada').length), detalle: 'en vivo dictadas', tono: 'crema' },
                { label: 'Por revisar', valor: String(aulas.reduce((s, a) => s + a.pendientes, 0)), detalle: 'entregas de tareas', tono: 'lima' },
              ])
            );
      case 'estudiante':
        return forkJoin({
          aulas: this.aulas.aulasEstudiante(espacioId, usuarioId),
          asistencia: colegio
            ? this.asistencia.registrosDeEstudiante(usuarioId).pipe(map((r) => r.filter((x) => x.estado !== 'licencia')), map((r) => porcentajeOpt(r.filter((x) => x.estado !== 'ausente').length, r.length)))
            : this.sesiones.sesionesEstudiante(espacioId, usuarioId).pipe(map((s) => s.filter((x) => x.estado === 'finalizada')), map((s) => porcentajeOpt(s.filter((x) => x.asisti).length, s.length))),
        }).pipe(
          map(({ aulas, asistencia }): IndicadorPerfil[] => {
            const avances = aulas.map((a) => a.anillos[0].valor).filter((v): v is number => v !== null);
            return [
              { label: colegio ? 'Materias' : 'Cursos', valor: String(aulas.length), detalle: colegio ? 'en tu paralelo' : 'inscritos', tono: 'lima' },
              { label: 'Mi progreso', valor: avances.length ? `${Math.round(avances.reduce((s, v) => s + v, 0) / avances.length)}%` : '—', detalle: 'del contenido visto', tono: 'azul' },
              { label: 'Asistencia', valor: asistencia, detalle: colegio ? 'de tus clases' : 'de las sesiones en vivo', tono: 'lima' },
              { label: 'Tareas', valor: String(aulas.reduce((s, a) => s + a.pendientes, 0)), detalle: 'por entregar', tono: 'crema' },
            ];
          })
        );
      case 'padre':
        return this.academico.hijosDe(usuarioId).pipe(
          switchMap((hijos) =>
            (hijos.length ? forkJoin(hijos.map((h) => this.tareas.tareasDeEstudiante(espacioId, h))) : of([])).pipe(
              map((listas): IndicadorPerfil[] => [
                { label: 'Hijos', valor: String(hijos.length), detalle: 'vinculados a tu cuenta', tono: 'lima' },
                { label: 'Tareas', valor: String(listas.flat().filter((t) => t.estado === 'pendiente' || t.estado === 'no-entregada').length), detalle: 'pendientes de tus hijos', tono: 'crema' },
                { label: 'Espacios', valor: String(MOCK_MEMBRESIAS.filter((m) => m.usuarioId === usuarioId).length), detalle: 'a los que perteneces', tono: 'azul' },
              ])
            )
          )
        );
      default:
        return forkJoin({ estudiantes: this.personas.estudiantes(), docentes: this.personas.docentes(), paralelos: this.academico.paralelosActivos(espacioId), materias: this.academico.materias(espacioId) }).pipe(
          map(({ estudiantes, docentes, paralelos, materias }): IndicadorPerfil[] => [
            { label: 'Estudiantes', valor: String(estudiantes.length), detalle: 'en la institución', tono: 'lima' },
            { label: 'Docentes', valor: String(docentes.filter((d) => d.activo).length), detalle: 'activos', tono: 'azul' },
            { label: 'Paralelos', valor: String(paralelos.length), detalle: 'esta gestión', tono: 'crema' },
            { label: 'Materias', valor: String(materias.length), detalle: 'en el plan', tono: 'lima' },
          ])
        );
    }
  }

  // ---------- Interno ----------
  private extra(usuarioId: number) {
    return (MOCK_PERFIL_EXTRA[usuarioId] ??= perfilExtraVacio());
  }

  private actualizar(usuarioId: number, cambio: (dto: (typeof MOCK_PERFILES)[number], extra: Perfil) => void): Observable<Perfil | null> {
    const dto = MOCK_PERFILES.find((p) => p.idUsuario === usuarioId);
    if (!dto) return throwError(() => new Error('La cuenta ya no existe.'));
    const extra = this.extra(usuarioId);
    const combinado = { ...dto, ...extra } as Perfil;
    cambio(combinado, combinado);
    const { idUsuario, username, gmail, status, nombre, primerApellido, segundoApellido, telefono, ci, imagenUrl, id_rol, ...resto } = combinado;
    Object.assign(dto, { idUsuario, username, gmail, status, nombre, primerApellido, segundoApellido, telefono, ci, imagenUrl, id_rol });
    Object.assign(extra, resto);
    this.version.update((v) => v + 1);
    return this.perfil(usuarioId);
  }
}

function porcentajeOpt(parte: number, total: number): string {
  return total ? `${porcentaje(parte, total)}%` : '—';
}
