import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  private apiUrl = `${environment.API_URL}/alert/send`;

  constructor(private http: HttpClient) {}

  // Enviar alerta al correo electrónico especificado
  sendAlert(email: string): Observable<string> {
    const body = { email: email };
    return this.http.post<string>(this.apiUrl, body, this.httpOptions())
      .pipe(
        catchError(this.handleError)
      );
  }

  // Opciones de cabecera para las peticiones
  private httpOptions() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    console.error('Error en la petición HTTP:', error);
    throw new Error('Ocurrió un error al enviar la alerta. Verifica la consola para más detalles.');
  }
}
