import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormField, form, minLength, required, submit, validate } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBell, faCalendarCheck, faClock, faFileMedical, faPaperclip, faPlus, faUserCheck, faUserXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../core/auth/session.service';
import { ESTADO_DIA_LABEL, EstadoDia, EstadoLicencia } from '../../core/models/asistencia.model';
import { contar, estadoDelDia, fechaCorta, hoyIso } from '../../core/utils/asistencia';
import { AcademicoService } from '../../services/academico.service';
import { AsistenciaService } from '../../services/asistencia.service';
import { HijoActivoService } from '../../services/hijo-activo.service';
import { SelectorHijoComponent } from '../../shared/ui/selector-hijo.component';
import { ProfileService } from '../../services/profile.service';
import { AvisosService } from '../../shared/ui/avisos.service';
import { DrawerComponent } from '../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { iconoMateria } from '../../shared/ui/iconos-academicos';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { AsistenciaAcademiaEstudianteComponent } from '../academia/asistencia-academia.component';
import { mensajeError } from '../direccion/academico/academico.ui';

const LICENCIA_VACIA = { desde: '', hasta: '', motivo: '' };

// "Mi asistencia" del estudiante y "Asistencia" del padre (sobre su hijo).
// El padre además ve avisos de faltas/atrasos y puede solicitar licencias.
@Component({
  selector: 'app-mi-asistencia',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent, EmptyStateComponent, DrawerComponent, SelectorHijoComponent, AsistenciaAcademiaEstudianteComponent],
  templateUrl: './mi-asistencia.component.html',
  styleUrls: ['./mi-asistencia.component.css'],
})
export class MiAsistenciaComponent {
  private session = inject(SessionService);
  private asistencia = inject(AsistenciaService);
  private academico = inject(AcademicoService);
  private perfiles = inject(ProfileService);
  private avisos = inject(AvisosService);
  private hijoActivo = inject(HijoActivoService);

  readonly estadoDiaLabel = ESTADO_DIA_LABEL;
  readonly fechaCorta = fechaCorta;
  readonly iconoMateria = iconoMateria;
  readonly faUserCheck = faUserCheck;
  readonly faUserXmark = faUserXmark;
  readonly faClock = faClock;
  readonly faFileMedical = faFileMedical;
  readonly faBell = faBell;
  readonly faPlus = faPlus;
  readonly faPaperclip = faPaperclip;
  readonly faCalendarCheck = faCalendarCheck;

  readonly espacio = this.session.espacioActivo()!;
  readonly esPadre = this.session.rolActivo() === 'padre';
  private readonly usuarioId = this.session.usuarioId()!;

  // Estudiante del que se muestra la asistencia (el propio o el hijo)
  readonly estudiante = rxResource({
    params: () => (this.esPadre ? this.hijoActivo.elegidoId() : 0),
    stream: () => {
      if (this.espacio.tipo !== 'colegio') return of(null);
      if (this.esPadre) return this.hijoActivo.activo().pipe(map((h) => (h ? { id: h.id, nombre: h.nombre } : null)));
      return this.perfiles.getProfile(this.usuarioId).pipe(map((p) => ({ id: this.usuarioId, nombre: p.nombre })));
    },
  });

  readonly datos = rxResource({
    params: () => this.estudiante.value()?.id ?? 0,
    stream: ({ params }) =>
      params
        ? forkJoin({
            registros: this.asistencia.registrosDeEstudiante(params),
            licencias: this.asistencia.licenciasDeEstudiante(params),
            materias: this.academico.materias(this.espacio.id),
          })
        : of(null),
  });

  readonly conteo = computed(() => contar(this.datos.value()?.registros ?? []));

  // Asistencia por materia
  readonly porMateria = computed(() => {
    const d = this.datos.value();
    if (!d) return [];
    return d.materias
      .map((m) => ({ materia: m, conteo: contar(d.registros.filter((r) => r.materiaId === m.id)) }))
      .filter((x) => x.conteo.total > 0)
      .sort((a, b) => a.conteo.porcentaje - b.conteo.porcentaje);
  });

  // Resumen diario de los últimos días con clases
  readonly dias = computed(() => {
    const d = this.datos.value();
    if (!d) return [];
    const porFecha = new Map<string, typeof d.registros>();
    for (const r of d.registros) porFecha.set(r.fecha, [...(porFecha.get(r.fecha) ?? []), r]);
    const nombreMateria = new Map(d.materias.map((m) => [m.id, m.nombre]));
    return [...porFecha.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .map(([fecha, registros]) => ({
        fecha,
        estado: estadoDelDia(registros) as EstadoDia,
        detalle: registros
          .filter((r) => r.estado !== 'presente')
          .map((r) => `${nombreMateria.get(r.materiaId) ?? 'Clase'}: ${r.estado === 'atraso' ? `atraso de ${r.minutosTarde} min` : r.estado}`),
      }));
  });

  // Avisos para el padre: faltas y atrasos de las últimas dos semanas
  readonly alertas = computed(() => this.dias().filter((d) => d.estado === 'ausente' || d.estado === 'parcial' || d.estado === 'atraso'));

  readonly licencias = computed(() => this.datos.value()?.licencias ?? []);

  // ---------- Solicitar licencia (padre) ----------
  readonly drawerAbierto = signal(false);
  readonly guardando = signal(false);
  readonly archivo = signal('');
  readonly hoy = hoyIso();
  readonly modelo = signal({ ...LICENCIA_VACIA });
  readonly formulario = form(this.modelo, (s) => {
    required(s.desde, { message: 'Elige desde qué día.' });
    required(s.hasta, { message: 'Elige hasta qué día.' });
    validate(s.hasta, ({ value, valueOf }) =>
      value() && valueOf(s.desde) && value() < valueOf(s.desde) ? { kind: 'orden', message: 'Debe ser igual o posterior a la fecha de inicio.' } : undefined
    );
    required(s.motivo, { message: 'Cuéntanos el motivo.' });
    minLength(s.motivo, 10, { message: 'Describe el motivo con al menos 10 caracteres.' });
  });

  abrirSolicitud(): void {
    this.modelo.set({ desde: this.hoy, hasta: this.hoy, motivo: '' });
    this.archivo.set('');
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }

  elegirArchivo(event: Event): void {
    this.archivo.set((event.target as HTMLInputElement).files?.[0]?.name ?? '');
  }

  solicitar(): void {
    const est = this.estudiante.value();
    if (!est) return;
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        await firstValueFrom(this.asistencia.solicitarLicencia({
          espacioId: this.espacio.id,
          estudianteId: est.id,
          solicitadaPor: this.usuarioId,
          ...this.modelo(),
          motivo: this.modelo().motivo.trim(),
          archivo: this.archivo(),
        }));
        this.avisos.exito('Licencia solicitada. La dirección la revisará.');
        this.drawerAbierto.set(false);
        this.datos.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  estadoLicenciaLabel(estado: EstadoLicencia): string {
    return { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' }[estado];
  }

  rango(desde: string, hasta: string): string {
    return desde === hasta ? fechaCorta(desde) : `${fechaCorta(desde)} – ${fechaCorta(hasta)}`;
  }
}
