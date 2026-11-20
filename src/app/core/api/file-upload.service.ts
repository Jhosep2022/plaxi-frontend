import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { SessionService } from '../auth/session.service';

export type UsoArchivo = 'tema' | 'entrega';

// Subida de archivos al almacenamiento (MinIO en desarrollo, Cloudflare R2 en producción):
// la API firma un enlace de subida, el navegador sube el archivo directo y la API lo confirma.
// Para leerlo, la API da un enlace temporal (5 minutos) solo a quien puede ver el recurso.
@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly http = inject(HttpClient);
  private readonly storageHttp = new HttpClient(inject(HttpBackend)); // directo al almacenamiento, sin el token de la API
  private readonly session = inject(SessionService);

  private get url(): string {
    return `${environment.API_URL}/espacios/${encodeURIComponent(this.session.activeSpace()!.slug)}/archivos`;
  }

  // Sube y confirma el archivo; devuelve su id
  upload(uso: UsoArchivo, archivo: File, recursoId: number): Observable<number> {
    const tipo = archivo.type || 'application/octet-stream';
    return this.http
      .post<{ id: number; urlSubida: string }>(`${this.url}/subida`, { uso, nombre: archivo.name, tipoMime: tipo, bytes: archivo.size, recursoId })
      .pipe(
        switchMap((subida) =>
          this.storageHttp.put(subida.urlSubida, archivo, { headers: { 'Content-Type': tipo }, responseType: 'text' }).pipe(
            switchMap(() => this.http.post(`${this.url}/${subida.id}/confirmar`, {})),
            map(() => subida.id),
          ),
        ),
      );
  }

  // Une el archivo confirmado a su recurso (el PDF de un tema)
  link(archivoId: number): Observable<void> {
    return this.http.put(`${this.url}/${archivoId}/vincular`, {}).pipe(map(() => undefined));
  }

  // Enlace temporal para ver o descargar el archivo
  downloadUrl(archivoId: number): Observable<string> {
    return this.http.get<{ url: string }>(`${this.url}/${archivoId}/enlace`).pipe(map((r) => r.url));
  }
}
