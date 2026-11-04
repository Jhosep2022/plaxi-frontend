import { Component, computed, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMugHot } from '@fortawesome/free-solid-svg-icons';
import { FilaVista, ItemVista } from '../../core/utils/horario';
import { iconoMateria } from '../ui/iconos-academicos';

// Grilla semanal de solo lectura: filas = periodos y recreos, columnas = días.
// La usan las vistas por docente y por aula, "Mi horario" del docente, estudiante y padre.
@Component({
  selector: 'app-horario-semanal',
  imports: [FaIconComponent],
  styleUrls: ['./horario-semanal.component.css'],
  template: `
    <div class="contenedor">
      <table class="grilla" [style.--dias]="dias().length">
        <thead>
          <tr>
            <th class="col-hora">Hora</th>
            @for (d of dias(); track d.id) {
              <th [class.hoy]="d.id === hoy()">{{ d.largo }}@if (d.id === hoy()) { <span class="ui-badge tono-lima">Hoy</span> }</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (fila of filas(); track fila.inicio + fila.fin) {
            @if (fila.tipo === 'recreo') {
              <tr class="fila-recreo">
                <td class="col-hora">{{ fila.inicio }}<br /><small>{{ fila.fin }}</small></td>
                <td [attr.colspan]="dias().length"><fa-icon [icon]="faMugHot" /> Recreo</td>
              </tr>
            } @else {
              <tr>
                <td class="col-hora">{{ fila.inicio }}<br /><small>{{ fila.fin }}</small></td>
                @for (d of dias(); track d.id) {
                  @let lista = celdas().get(d.id + '|' + fila.inicio) ?? [];
                  <td [class.hoy]="d.id === hoy()" [class.choque]="lista.length > 1">
                    @if (lista.length > 1) {
                      <span class="aviso-choque" title="Hay más de una clase a esta hora">Choque de horario</span>
                    }
                    @for (item of lista; track $index) {
                      @if (clicable()) {
                        <button type="button" class="clase" [class]="'tono-' + item.tono" (click)="elegir.emit(item)" [attr.aria-label]="item.titulo + ', ' + d.largo + ' ' + item.inicio">
                          <span class="titulo"><fa-icon [icon]="iconoMateria(item.icono)" /> {{ item.titulo }}</span>
                          @for (linea of item.detalle; track $index) { <small>{{ linea }}</small> }
                        </button>
                      } @else {
                        <div class="clase" [class]="'tono-' + item.tono">
                          <span class="titulo"><fa-icon [icon]="iconoMateria(item.icono)" /> {{ item.titulo }}</span>
                          @for (linea of item.detalle; track $index) { <small>{{ linea }}</small> }
                        </div>
                      }
                    } @empty {
                      <div class="libre"></div>
                    }
                  </td>
                }
              </tr>
            }
          } @empty {
            <tr><td class="vacio" [attr.colspan]="dias().length + 1">{{ vacio() }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class HorarioSemanalComponent {
  readonly dias = input.required<{ id: number; largo: string }[]>();
  readonly filas = input.required<FilaVista[]>();
  readonly items = input.required<ItemVista[]>();
  readonly clicable = input(false);
  readonly vacio = input('No hay clases para mostrar.');
  readonly elegir = output<ItemVista>();

  readonly iconoMateria = iconoMateria;
  readonly faMugHot = faMugHot;

  // Día de hoy (1 = lunes … 7 = domingo) para resaltar su columna
  readonly hoy = computed(() => ((new Date().getDay() + 6) % 7) + 1);

  // Clases por "día|hora"; normalmente una, pero si hay un choque se muestran todas
  readonly celdas = computed(() => {
    const mapa = new Map<string, ItemVista[]>();
    for (const i of this.items()) {
      const clave = `${i.dia}|${i.inicio}`;
      mapa.set(clave, [...(mapa.get(clave) ?? []), i]);
    }
    return mapa;
  });
}
