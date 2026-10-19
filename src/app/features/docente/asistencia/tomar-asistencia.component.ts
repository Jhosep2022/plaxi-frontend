import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faCheck, faCheckDouble, faClock, faUserCheck } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { paraleloLabel } from '../../../core/models/academico.model';
import { ESTADOS_ASISTENCIA, EstadoAsistencia } from '../../../core/models/asistencia.model';
import { contar, diaDeSemana, fechaLarga, hoyIso, licenciaCubre, sumarDias } from '../../../core/utils/asistencia';
import { clasesDeDocente, rangoDeBloque } from '../../../core/utils/horario';
import { AsistenciaService } from '../../../services/asistencia.service';
import { HorariosService } from '../../../services/horarios.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { iconoMateria } from '../../../shared/ui/iconos-academicos';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

interface Marca {
  estado: EstadoAsistencia;
  minutosTarde: number;
}

@Component({
  selector: 'app-tomar-asistencia',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './tomar-asistencia.component.html',
  styleUrls: ['./tomar-asistencia.component.css'],
})
export class TomarAsistenciaComponent {
  private session = inject(SessionService);
  private horarios = inject(HorariosService);
  private asistencia = inject(AsistenciaService);
  private avisos = inject(AvisosService);

  readonly estados = ESTADOS_ASISTENCIA;
  readonly iconoMateria = iconoMateria;
  readonly fechaLarga = fechaLarga;
  readonly paraleloLabel = paraleloLabel;
  readonly faCalendarDays = faCalendarDays;
  readonly faCheck = faCheck;
  readonly faCheckDouble = faCheckDouble;
  readonly faClock = faClock;
  readonly faUserCheck = faUserCheck;

  readonly espacio = this.session.espacioActivo()!;
  private readonly docenteId = this.session.usuarioId()!;
  readonly hoy = hoyIso();

  readonly datos = rxResource({ stream: () => (this.espacio.tipo === 'colegio' ? this.horarios.datos(this.espacio.id) : of(null)) });
  private readonly misClases = computed(() => {
    const d = this.datos.value();
    return d ? clasesDeDocente(d, this.docenteId) : [];
  });

  // Fecha: hoy si hay clases; si no, el último día (hasta 14 días atrás) en que el docente tuvo clases
  readonly fecha = linkedSignal(() => {
    const dias = new Set(this.misClases().map((c) => c.dia));
    for (let i = 0; i < 14; i++) {
      const f = sumarDias(this.hoy, -i);
      if (dias.has(diaDeSemana(f))) return f;
    }
    return this.hoy;
  });

  // Clases del docente en la fecha elegida, con su hora, paralelo y materia
  readonly clasesDelDia = computed(() => {
    const d = this.datos.value();
    if (!d) return [];
    const dia = diaDeSemana(this.fecha());
    return this.misClases()
      .filter((c) => c.dia === dia)
      .map((c) => ({
        clase: c,
        rango: rangoDeBloque(d, c.paraleloId, c.bloque),
        paralelo: d.paralelos.find((p) => p.id === c.paraleloId)!,
        materia: d.materias.find((m) => m.id === c.materiaId),
        aula: d.aulas.find((a) => a.id === c.aulaId)?.nombre ?? 'Sin aula',
      }))
      .filter((x) => x.rango && x.paralelo)
      .sort((a, b) => a.rango!.inicio.localeCompare(b.rango!.inicio));
  });

  readonly seleccionadaId = linkedSignal(() => this.clasesDelDia()[0]?.clase.id ?? 0);
  readonly seleccionada = computed(() => this.clasesDelDia().find((c) => c.clase.id === this.seleccionadaId()) ?? null);

  readonly estudiantes = rxResource({
    params: () => this.seleccionada()?.paralelo.id ?? 0,
    stream: ({ params }) => this.asistencia.estudiantesDeParalelo(params),
    defaultValue: [],
  });

  readonly registros = rxResource({
    params: () => {
      const s = this.seleccionada();
      return s ? { paraleloId: s.clase.paraleloId, materiaId: s.clase.materiaId, bloque: s.clase.bloque, fecha: this.fecha() } : null;
    },
    stream: ({ params }) => (params ? this.asistencia.registrosDeClase(params) : of([])),
    defaultValue: [],
  });

  private readonly licencias = rxResource({ stream: () => this.asistencia.licencias(this.espacio.id), defaultValue: [] });

  // Estudiantes con licencia aprobada en la fecha elegida
  readonly conLicencia = computed(() => new Set(this.licencias.value().filter((l) => licenciaCubre(l, this.fecha())).map((l) => l.estudianteId)));

  readonly yaTomada = computed(() => this.registros.value().length > 0);

  // Marcas editables: parten de lo ya registrado (o "presente"), y licencia si tiene licencia aprobada
  readonly marcas = linkedSignal<Map<number, Marca>>(() => {
    const previos = new Map(this.registros.value().map((r) => [r.estudianteId, r]));
    return new Map(this.estudiantes.value().map((e) => {
      const previo = previos.get(e.id);
      const estado: EstadoAsistencia = this.conLicencia().has(e.id) ? 'licencia' : previo?.estado ?? 'presente';
      return [e.id, { estado, minutosTarde: previo?.minutosTarde ?? 0 }];
    }));
  });

  readonly conteo = computed(() => contar([...this.marcas().values()]));

  // ---------- Tolerancia de atraso ----------
  readonly tolerancia = rxResource({ stream: () => this.asistencia.tolerancia(this.docenteId), defaultValue: 10 });
  readonly editandoTolerancia = signal(false);
  readonly toleranciaNueva = linkedSignal(() => this.tolerancia.value());

  async guardarTolerancia(): Promise<void> {
    try {
      await firstValueFrom(this.asistencia.guardarTolerancia(this.docenteId, Number(this.toleranciaNueva())));
      this.avisos.exito(`Tolerancia de atraso: ${this.toleranciaNueva()} minutos.`);
      this.editandoTolerancia.set(false);
      this.tolerancia.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  // ---------- Marcar ----------
  readonly guardando = signal(false);

  marcar(estudianteId: number, estado: EstadoAsistencia): void {
    this.marcas.update((m) => {
      const copia = new Map(m);
      const actual = copia.get(estudianteId)!;
      copia.set(estudianteId, { estado, minutosTarde: estado === 'atraso' ? actual.minutosTarde || this.tolerancia.value() + 5 : 0 });
      return copia;
    });
  }

  cambiarMinutos(estudianteId: number, minutos: number): void {
    this.marcas.update((m) => new Map(m).set(estudianteId, { estado: 'atraso', minutosTarde: Math.max(0, Number(minutos) || 0) }));
  }

  todosPresentes(): void {
    this.marcas.update((m) => new Map([...m].map(([id, marca]) => [id, marca.estado === 'licencia' && this.conLicencia().has(id) ? marca : { estado: 'presente' as const, minutosTarde: 0 }])));
  }

  // Un atraso dentro de la tolerancia se registra como presente
  dentroDeTolerancia(marca: Marca): boolean {
    return marca.estado === 'atraso' && marca.minutosTarde <= this.tolerancia.value();
  }

  async guardar(): Promise<void> {
    const s = this.seleccionada();
    if (!s) return;
    this.guardando.set(true);
    try {
      const marcas = [...this.marcas()].map(([estudianteId, m]) => ({
        estudianteId,
        estado: this.dentroDeTolerancia(m) ? ('presente' as const) : m.estado,
        minutosTarde: m.minutosTarde,
      }));
      await firstValueFrom(this.asistencia.guardarAsistencia(
        { espacioId: this.espacio.id, paraleloId: s.clase.paraleloId, materiaId: s.clase.materiaId, bloque: s.clase.bloque, fecha: this.fecha(), docenteId: this.docenteId },
        marcas
      ));
      const c = contar(marcas);
      this.avisos.exito(`Asistencia de ${paraleloLabel(s.paralelo)} guardada: ${c.presente} presentes, ${c.ausente} ausentes, ${c.atraso} atrasos.`);
      this.registros.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  cambiarFecha(valor: string): void {
    if (valor && valor <= this.hoy) this.fecha.set(valor);
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').map((p) => p.charAt(0)).join('').slice(0, 2).toUpperCase();
  }
}
