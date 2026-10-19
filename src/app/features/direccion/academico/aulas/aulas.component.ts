import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faDoorOpen, faPen, faPlus, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../../core/auth/session.service';
import { Aula, TIPOS_AULA, TipoAula, paraleloLabel } from '../../../../core/models/academico.model';
import { AcademicoService } from '../../../../services/academico.service';
import { AvisosService } from '../../../../shared/ui/avisos.service';
import { DrawerComponent } from '../../../../shared/ui/drawer.component';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header.component';
import { ICONO_AULA, mensajeError } from '../academico.ui';

const TONO_AULA: Record<TipoAula, string> = {
  aula: 'tono-lima',
  laboratorio: 'tono-azul',
  computacion: 'tono-azul',
  deportes: 'tono-crema',
  biblioteca: 'tono-crema',
  otro: 'tono-crema',
};

const AULA_VACIA = { nombre: '', tipo: 'aula' as TipoAula, capacidad: 30, ubicacion: '', activa: true };

@Component({
  selector: 'app-aulas',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormField, PageHeaderComponent, DrawerComponent, EmptyStateComponent],
  templateUrl: './aulas.component.html',
  styleUrls: ['./aulas.component.css'],
})
export class AulasComponent {
  private academico = inject(AcademicoService);
  private avisos = inject(AvisosService);
  private readonly espacioId = inject(SessionService).espacioActivo()!.id;

  readonly tipos = TIPOS_AULA;
  readonly iconoAula = ICONO_AULA;
  readonly tonoAula = TONO_AULA;
  readonly faPlus = faPlus;
  readonly faPen = faPen;
  readonly faTrash = faTrash;
  readonly faUsers = faUsers;
  readonly faDoorOpen = faDoorOpen;

  readonly aulas = rxResource({ stream: () => this.academico.aulas(this.espacioId), defaultValue: [] });
  private readonly paralelos = rxResource({ stream: () => this.academico.paralelosActivos(this.espacioId), defaultValue: [] });

  readonly filtro = signal<TipoAula | 'todas'>('todas');

  readonly aulasFiltradas = computed(() => {
    const filtro = this.filtro();
    return this.aulas.value().filter((a) => filtro === 'todas' || a.tipo === filtro);
  });

  readonly conteoPorTipo = computed(() => {
    const conteo: Partial<Record<TipoAula, number>> = {};
    for (const a of this.aulas.value()) conteo[a.tipo] = (conteo[a.tipo] ?? 0) + 1;
    return conteo;
  });

  // Paralelos que usan cada aula como aula fija
  readonly ocupacion = computed(() => {
    const mapa = new Map<number, string[]>();
    for (const p of this.paralelos.value()) {
      if (p.aulaId) mapa.set(p.aulaId, [...(mapa.get(p.aulaId) ?? []), paraleloLabel(p)]);
    }
    return mapa;
  });

  readonly resumen = computed(() => {
    const activas = this.aulas.value().filter((a) => a.activa);
    return {
      total: activas.length,
      capacidad: activas.reduce((s, a) => s + a.capacidad, 0),
      libres: activas.filter((a) => a.tipo === 'aula' && !this.ocupacion().has(a.id)).length,
    };
  });

  // ---------- Formulario ----------
  readonly drawerAbierto = signal(false);
  readonly editandoId = signal(0);
  readonly guardando = signal(false);
  readonly modelo = signal({ ...AULA_VACIA });
  readonly formulario = form(this.modelo, (s) => {
    required(s.nombre, { message: 'Escribe el nombre del espacio.' });
    maxLength(s.nombre, 60, { message: 'Máximo 60 caracteres.' });
    min(s.capacidad, 1, { message: 'La capacidad debe ser al menos 1.' });
    max(s.capacidad, 1000, { message: 'La capacidad máxima es 1000.' });
    maxLength(s.ubicacion, 80, { message: 'Máximo 80 caracteres.' });
  });

  nuevo(): void {
    this.abrir(0, { ...AULA_VACIA });
  }

  editar(aula: Aula): void {
    const { nombre, tipo, capacidad, ubicacion, activa } = aula;
    this.abrir(aula.id, { nombre, tipo, capacidad, ubicacion, activa });
  }

  guardar(): void {
    submit(this.formulario, async () => {
      this.guardando.set(true);
      try {
        await firstValueFrom(this.academico.guardarAula({ ...this.modelo(), id: this.editandoId() || undefined, espacioId: this.espacioId }));
        this.avisos.exito(this.editandoId() ? 'Aula actualizada.' : 'Aula creada.');
        this.drawerAbierto.set(false);
        this.aulas.reload();
      } catch (error) {
        this.avisos.error(mensajeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  async eliminar(aula: Aula): Promise<void> {
    if (!confirm(`¿Eliminar "${aula.nombre}"?`)) return;
    try {
      await firstValueFrom(this.academico.eliminarAula(aula));
      this.avisos.exito('Aula eliminada.');
      this.aulas.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    }
  }

  tipoLabel(tipo: TipoAula): string {
    return this.tipos.find((t) => t.id === tipo)?.label ?? tipo;
  }

  private abrir(id: number, valores: typeof AULA_VACIA): void {
    this.editandoId.set(id);
    this.modelo.set(valores);
    this.formulario().reset();
    this.drawerAbierto.set(true);
  }
}
