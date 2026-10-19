import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faClock, faFileCsv, faHourglassHalf, faPrint, faUserClock, faUserXmark } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { hoyIso, sumarDias } from '../../../core/utils/asistencia';
import { descargarCsv, fechasEntre, porcentaje } from '../../../core/utils/reportes';
import { AcademicoService } from '../../../services/academico.service';
import { MarcacionService } from '../../../services/marcacion.service';
import { BarrasComponent, ItemGrafico } from '../../../shared/reportes/graficos.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';

const META = 90; // % de puntualidad esperado

interface FilaDocente {
  nombre: string;
  esperados: number; // días que tenía que marcar
  aTiempo: number;
  atrasos: number;
  minutosAtraso: number;
  faltas: number; // días pasados sin marcar entrada
  salidasAnticipadas: number;
  puntualidad: number; // % de días a tiempo sobre los días que ya pasaron
}

// Reporte de puntualidad del personal a partir de las marcaciones con QR + GPS
@Component({
  selector: 'app-reporte-puntualidad',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, PageHeaderComponent, EmptyStateComponent, BarrasComponent],
  templateUrl: './puntualidad.component.html',
  styleUrls: ['./reportes.css'],
})
export class PuntualidadComponent {
  private academico = inject(AcademicoService);
  private marcacion = inject(MarcacionService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly META = META;
  readonly faClock = faClock;
  readonly faFileCsv = faFileCsv;
  readonly faHourglassHalf = faHourglassHalf;
  readonly faPrint = faPrint;
  readonly faUserClock = faUserClock;
  readonly faUserXmark = faUserXmark;

  readonly hoy = hoyIso();
  readonly desde = signal(sumarDias(this.hoy, -14));
  readonly hasta = signal(this.hoy);

  readonly datos = rxResource({
    params: () => ({ desde: this.desde(), hasta: this.hasta() }),
    stream: ({ params }) =>
      forkJoin({
        marcaciones: this.marcacion.marcacionesEntre(this.espacioId, params.desde, params.hasta),
        docentes: this.academico.docentes(this.espacioId),
      }),
  });

  readonly filas = computed<FilaDocente[]>(() => {
    const d = this.datos.value();
    if (!d) return [];
    const filas = new Map<number, FilaDocente>();
    const fila = (docenteId: number) => {
      if (!filas.has(docenteId)) {
        const nombre = d.docentes.find((x) => x.id === docenteId)?.nombre ?? `Docente ${docenteId}`;
        filas.set(docenteId, { nombre, esperados: 0, aTiempo: 0, atrasos: 0, minutosAtraso: 0, faltas: 0, salidasAnticipadas: 0, puntualidad: 0 });
      }
      return filas.get(docenteId)!;
    };
    for (const fecha of fechasEntre(this.desde(), this.hasta())) {
      for (const { docenteId } of this.marcacion.docentesEsperados(this.espacioId, fecha)) {
        const f = fila(docenteId);
        f.esperados++;
        const delDia = d.marcaciones.filter((m) => m.docenteId === docenteId && m.fecha === fecha);
        const entrada = delDia.find((m) => m.tipo === 'entrada');
        if (!entrada) {
          if (fecha < this.hoy) f.faltas++;
        } else if (entrada.estado === 'atraso') {
          f.atrasos++;
          f.minutosAtraso += entrada.minutos;
        } else {
          f.aTiempo++;
        }
        if (delDia.some((m) => m.estado === 'salida-anticipada')) f.salidasAnticipadas++;
      }
    }
    return [...filas.values()]
      .map((f) => ({ ...f, puntualidad: porcentaje(f.aTiempo, f.aTiempo + f.atrasos + f.faltas) }))
      .sort((a, b) => a.puntualidad - b.puntualidad || a.nombre.localeCompare(b.nombre));
  });

  readonly resumen = computed(() => {
    const fs = this.filas();
    const suma = (k: keyof FilaDocente) => fs.reduce((s, f) => s + (f[k] as number), 0);
    const aTiempo = suma('aTiempo');
    return {
      puntualidad: porcentaje(aTiempo, aTiempo + suma('atrasos') + suma('faltas')),
      atrasos: suma('atrasos'),
      minutos: suma('minutosAtraso'),
      faltas: suma('faltas'),
    };
  });

  readonly grafico = computed<ItemGrafico[]>(() =>
    this.filas().map((f) => ({ etiqueta: f.nombre, valor: f.puntualidad, texto: `${f.puntualidad}%`, detalle: `${f.aTiempo} de ${f.aTiempo + f.atrasos + f.faltas} días a tiempo`, alerta: f.puntualidad < META }))
  );

  cambiarDesde(valor: string): void {
    if (valor && valor <= this.hasta()) this.desde.set(valor);
  }

  cambiarHasta(valor: string): void {
    if (valor && valor >= this.desde() && valor <= this.hoy) this.hasta.set(valor);
  }

  exportar(): void {
    descargarCsv(`puntualidad-${this.desde()}-a-${this.hasta()}`, ['Docente', 'Días con clases', 'A tiempo', 'Atrasos', 'Minutos de atraso', 'Faltas', 'Salidas anticipadas', '% puntualidad'],
      this.filas().map((f) => [f.nombre, f.esperados, f.aTiempo, f.atrasos, f.minutosAtraso, f.faltas, f.salidasAnticipadas, f.puntualidad]));
  }

  imprimir(): void {
    window.print();
  }
}
