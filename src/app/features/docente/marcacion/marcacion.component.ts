import { Component, DestroyRef, ElementRef, computed, inject, isDevMode, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCamera, faCheck, faCircleCheck, faClock, faListCheck, faLocationDot, faQrcode, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { SessionService } from '../../../core/auth/session.service';
import { ESTADO_MARCACION_LABEL, Marcacion, PuntoMarcacion, TipoMarcacion } from '../../../core/models/marcacion.model';
import { hoyIso } from '../../../core/utils/asistencia';
import { distanciaLabel, distanciaMetros, leerQr } from '../../../core/utils/marcacion';
import { MarcacionService } from '../../../services/marcacion.service';
import { AvisosService } from '../../../shared/ui/avisos.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { mensajeError } from '../../direccion/academico/academico.ui';

interface Ubicacion {
  latitud: number;
  longitud: number;
  precision: number;
  demo?: boolean;
}

// API nativa de lectura de códigos (Chrome en Android y otros navegadores modernos)
declare const BarcodeDetector: { new (opciones: { formats: string[] }): { detect(fuente: CanvasImageSource): Promise<{ rawValue: string }[]> } } | undefined;

@Component({
  selector: 'app-marcacion',
  host: { class: 'ui-pagina' },
  imports: [FaIconComponent, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './marcacion.component.html',
  styleUrls: ['./marcacion.component.css'],
})
export class MarcacionComponent {
  private marcacion = inject(MarcacionService);
  private avisos = inject(AvisosService);
  protected readonly session = inject(SessionService);

  readonly modoDemo = isDevMode();
  readonly estadoLabel = ESTADO_MARCACION_LABEL;
  readonly distanciaLabel = distanciaLabel;
  readonly faQrcode = faQrcode;
  readonly faLocationDot = faLocationDot;
  readonly faCamera = faCamera;
  readonly faCheck = faCheck;
  readonly faCircleCheck = faCircleCheck;
  readonly faClock = faClock;
  readonly faListCheck = faListCheck;
  readonly faTriangleExclamation = faTriangleExclamation;

  private readonly espacioId = this.session.espacioActivo()!.id;
  private readonly docenteId = this.session.usuarioId()!;
  readonly hoy = hoyIso();

  readonly esperado = this.marcacion.esperado(this.espacioId, this.docenteId, this.hoy);
  readonly puntos = rxResource({ stream: () => this.marcacion.puntos(this.espacioId), defaultValue: [] });
  readonly marcaciones = rxResource({ stream: () => this.marcacion.marcacionesDe(this.docenteId), defaultValue: [] });

  readonly deHoy = computed(() => this.marcaciones.value().filter((m) => m.fecha === this.hoy));
  readonly entrada = computed(() => this.deHoy().find((m) => m.tipo === 'entrada') ?? null);
  readonly salida = computed(() => this.deHoy().find((m) => m.tipo === 'salida') ?? null);
  readonly siguiente = computed<TipoMarcacion | null>(() => (!this.entrada() ? 'entrada' : !this.salida() ? 'salida' : null));

  // ---------- Paso 1: ubicación ----------
  readonly marcando = signal(false);
  readonly ubicacion = signal<Ubicacion | null>(null);
  readonly errorUbicacion = signal('');
  readonly buscandoUbicacion = signal(false);

  // Punto activo más cercano y su distancia
  readonly cercano = computed(() => {
    const u = this.ubicacion();
    if (!u) return null;
    const lista = this.puntos.value().filter((p) => p.activo).map((p) => ({ punto: p, distancia: distanciaMetros(p, u) }));
    return lista.sort((a, b) => a.distancia - b.distancia)[0] ?? null;
  });
  readonly dentroDelRadio = computed(() => {
    const c = this.cercano();
    return !!c && c.distancia <= c.punto.radioM;
  });

  iniciar(): void {
    this.marcando.set(true);
    this.resultado.set(null);
    this.codigo.set('');
    this.pedirUbicacion();
  }

  cancelar(): void {
    this.detenerCamara();
    this.marcando.set(false);
    this.ubicacion.set(null);
    this.errorUbicacion.set('');
  }

  pedirUbicacion(): void {
    this.errorUbicacion.set('');
    if (!('geolocation' in navigator)) {
      this.errorUbicacion.set('Tu navegador no permite obtener la ubicación.');
      return;
    }
    this.buscandoUbicacion.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.buscandoUbicacion.set(false);
        this.ubicacion.set({ latitud: pos.coords.latitude, longitud: pos.coords.longitude, precision: Math.round(pos.coords.accuracy) });
      },
      (error) => {
        this.buscandoUbicacion.set(false);
        this.errorUbicacion.set(
          error.code === error.PERMISSION_DENIED
            ? 'No diste permiso para usar tu ubicación. Actívalo en el navegador para poder marcar.'
            : 'No pudimos obtener tu ubicación. Verifica que el GPS esté encendido e inténtalo de nuevo.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Solo en desarrollo: simula estar en el primer punto de marcación
  usarUbicacionDemo(): void {
    const p = this.puntos.value().find((x) => x.activo);
    if (!p) return;
    this.errorUbicacion.set('');
    this.ubicacion.set({ latitud: p.latitud + 0.0002, longitud: p.longitud, precision: 10, demo: true });
  }

  // ---------- Paso 2: código (QR o manual) ----------
  readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  readonly puedeEscanear = typeof BarcodeDetector !== 'undefined';
  readonly camaraActiva = signal(false);
  readonly codigo = signal('');
  readonly puntoDelQr = signal<number | null>(null);
  readonly enviando = signal(false);
  readonly resultado = signal<Marcacion | null>(null);
  private flujo: MediaStream | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detenerCamara());
  }

  async abrirCamara(): Promise<void> {
    if (!this.puedeEscanear) return;
    try {
      this.flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.camaraActiva.set(true);
      queueMicrotask(async () => {
        const video = this.video()?.nativeElement;
        if (!video || !this.flujo) return;
        video.srcObject = this.flujo;
        await video.play();
        const detector = new BarcodeDetector!({ formats: ['qr_code'] });
        this.intervalo = setInterval(async () => {
          const [leido] = await detector.detect(video).catch(() => []);
          const qr = leido ? leerQr(leido.rawValue) : null;
          if (qr) {
            this.detenerCamara();
            this.puntoDelQr.set(qr.puntoId);
            this.codigo.set(qr.codigo);
            this.enviar();
          }
        }, 350);
      });
    } catch {
      this.avisos.error('No pudimos abrir la cámara. Escribe el código que aparece en la pantalla.');
    }
  }

  detenerCamara(): void {
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = null;
    this.flujo?.getTracks().forEach((t) => t.stop());
    this.flujo = null;
    this.camaraActiva.set(false);
  }

  async enviar(): Promise<void> {
    const tipo = this.siguiente();
    const u = this.ubicacion();
    const punto: PuntoMarcacion | undefined = this.puntos.value().find((p) => p.id === this.puntoDelQr()) ?? this.cercano()?.punto;
    const codigo = this.codigo().replace(/\D/g, '');
    if (!tipo || !u || !punto) return;
    if (codigo.length !== 6) {
      this.avisos.error('El código tiene 6 dígitos.');
      return;
    }
    this.enviando.set(true);
    try {
      const marcacion = await firstValueFrom(this.marcacion.marcar({
        espacioId: this.espacioId, docenteId: this.docenteId, tipo, puntoId: punto.id, codigo, latitud: u.latitud, longitud: u.longitud,
      }));
      this.resultado.set(marcacion);
      this.marcando.set(false);
      this.marcaciones.reload();
    } catch (error) {
      this.avisos.error(mensajeError(error));
    } finally {
      this.enviando.set(false);
    }
  }
}
