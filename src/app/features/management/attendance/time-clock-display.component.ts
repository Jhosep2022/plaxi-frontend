import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { SessionService } from '../../../core/auth/session.service';
import { SEGUNDOS_POR_CODIGO } from '../../../core/models/time-tracking.model';
import { codigoDeVentana, contenidoQr, segundosRestantes, ventanaActual } from '../../../core/utils/time-tracking';
import { TimeTrackingService } from '../../../services/time-tracking.service';
import { QrComponent } from '../../../shared/ui/qr.component';

// Pantalla para dejar en la entrada: QR y código que cambian cada 30 segundos
@Component({
  selector: 'app-time-clock-display',
  imports: [QrComponent],
  styleUrls: ['./time-clock-display.component.css'],
  template: `
    @if (punto(); as p) {
      <main class="pantalla">
        <header>
          <img src="assets/Logo_icon.png" alt="QuizWiz" class="logo" />
          <div>
            <h1>{{ p.nombre }}</h1>
            <p>{{ espacio.nombre }} · Marcación del personal</p>
          </div>
          <span class="reloj">{{ hora() }}</span>
        </header>

        <section class="centro">
          <div class="qr-marco">
            <app-qr [texto]="qr()" etiqueta="Código QR de marcación" />
          </div>
          <div class="lateral">
            <h2>Escanea para marcar</h2>
            <ol>
              <li>Abre QuizWiz en tu celular → <strong>Marcación</strong>.</li>
              <li>Permite tu ubicación.</li>
              <li>Escanea este código o escribe el número.</li>
            </ol>
            <p class="codigo" aria-live="polite">{{ codigo().slice(0, 3) }} {{ codigo().slice(3) }}</p>
            <div class="cuenta">
              <div class="barra"><span [style.width.%]="(restantes() / total) * 100"></span></div>
              <small>Cambia en {{ restantes() }} s</small>
            </div>
          </div>
        </section>
      </main>
    } @else if (!puntos.isLoading()) {
      <main class="pantalla"><p class="error">Este punto de marcación no existe o está desactivado.</p></main>
    }
  `,
})
export class TimeClockDisplayComponent {
  private marcacion = inject(TimeTrackingService);
  readonly espacio = inject(SessionService).activeSpace()!;

  readonly puntoId = input.required({ transform: numberAttribute });
  readonly total = SEGUNDOS_POR_CODIGO;

  readonly puntos = rxResource({ stream: () => this.marcacion.getLocations(this.espacio.id), defaultValue: [] });
  readonly punto = computed(() => this.puntos.value().find((p) => p.id === this.puntoId() && p.activo) ?? null);

  // Reloj que avanza cada segundo
  private readonly ahora = toSignal(timer(0, 1000).pipe(map(() => Date.now())), { initialValue: Date.now() });

  readonly codigo = computed(() => {
    const p = this.punto();
    return p ? codigoDeVentana(p.secreto, ventanaActual(this.ahora())) : '000000';
  });
  readonly qr = computed(() => contenidoQr(this.puntoId(), this.codigo()));
  readonly restantes = computed(() => segundosRestantes(this.ahora()));
  readonly hora = computed(() => new Date(this.ahora()).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
}
