import { Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCalendarDays, faChalkboardTeacher, faCircleCheck, faClock, faUserXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { ESTADO_MARCACION_LABEL } from '../../../core/models/marcacion.model';
import { fechaLarga, hoyIso, sumarDias } from '../../../core/utils/asistencia';
import { AcademicoService } from '../../../services/academico.service';
import { MarcacionService } from '../../../services/marcacion.service';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

// Asistencia del personal docente según sus marcaciones (QR + GPS)
@Component({
  selector: 'app-personal-asistencia',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormsModule, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './personal-asistencia.component.html',
  styles: `
    .fecha { display: flex; align-items: center; gap: 8px; color: var(--muted); }
    .fecha .ui-input { width: 170px; }
    .dia { margin: 0 0 12px; font-size: 17px; }
    .indicadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .indicador { display: flex; align-items: center; gap: 12px; }
    .indicador div { display: flex; flex-direction: column; }
    .indicador strong { font-size: 24px; }
    .indicador small { font-size: 12px; color: var(--muted); }
    .destacado { border-color: var(--lime-green); background: var(--lime-soft); }
    .ui-icono.ausente { background: #fdf0ee; color: #c0392b; }
    .ui-tabla small { color: var(--muted); }
    .estado-a-tiempo, .estado-salida { background: var(--lime-soft); color: var(--lime-strong); }
    .estado-atraso, .estado-salida-anticipada { background: var(--light-cream); color: var(--cream-strong); }
    .falta { background: #fdf0ee; color: #c0392b; }
    .pendiente { color: var(--muted); }
  `,
})
export class PersonalAsistenciaComponent {
  private session = inject(SessionService);
  private marcacion = inject(MarcacionService);
  private academico = inject(AcademicoService);

  readonly estadoLabel = ESTADO_MARCACION_LABEL;
  readonly fechaLarga = fechaLarga;
  readonly faCalendarDays = faCalendarDays;
  readonly faCircleCheck = faCircleCheck;
  readonly faClock = faClock;
  readonly faUserXmark = faUserXmark;
  readonly faChalkboardTeacher = faChalkboardTeacher;

  private readonly espacioId = this.session.espacioActivo()!.id;
  readonly hoy = hoyIso();

  readonly datos = rxResource({
    stream: () => forkJoin({
      marcaciones: this.marcacion.marcacionesEntre(this.espacioId, sumarDias(this.hoy, -30), this.hoy),
      docentes: this.academico.docentes(this.espacioId),
      puntos: this.marcacion.puntos(this.espacioId),
    }),
  });

  // Hoy si alguien debe marcar; si no, el último día con marcaciones
  readonly fecha = linkedSignal(() => {
    if (this.marcacion.docentesEsperados(this.espacioId, this.hoy).length) return this.hoy;
    return (this.datos.value()?.marcaciones ?? []).map((m) => m.fecha).sort().at(-1) ?? this.hoy;
  });

  readonly filas = computed(() => {
    const d = this.datos.value();
    if (!d) return [];
    const fecha = this.fecha();
    const delDia = d.marcaciones.filter((m) => m.fecha === fecha);
    const punto = new Map(d.puntos.map((p) => [p.id, p.nombre]));
    return this.marcacion.docentesEsperados(this.espacioId, fecha)
      .map(({ docenteId, esperado }) => {
        const entrada = delDia.find((m) => m.docenteId === docenteId && m.tipo === 'entrada');
        const salida = delDia.find((m) => m.docenteId === docenteId && m.tipo === 'salida');
        return {
          nombre: d.docentes.find((x) => x.id === docenteId)?.nombre ?? `Docente ${docenteId}`,
          esperado,
          entrada,
          salida,
          punto: entrada ? punto.get(entrada.puntoId) ?? '' : '',
        };
      })
      .sort((a, b) => Number(!!a.entrada) - Number(!!b.entrada) || a.nombre.localeCompare(b.nombre));
  });

  readonly resumen = computed(() => {
    const filas = this.filas();
    return {
      esperados: filas.length,
      marcaron: filas.filter((f) => f.entrada).length,
      atrasos: filas.filter((f) => f.entrada?.estado === 'atraso').length,
      sinMarcar: filas.filter((f) => !f.entrada).length,
    };
  });

  cambiarFecha(valor: string): void {
    if (valor && valor <= this.hoy) this.fecha.set(valor);
  }
}
