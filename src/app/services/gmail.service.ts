import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http'; // MOCK: desconectado del backend
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
// import { catchError } from 'rxjs/operators'; // MOCK: desconectado del backend
// import { environment } from '../../environments/environment'; // MOCK: desconectado del backend
import { MOCK_DELAY } from '../mocks/mock-data';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  // private apiUrl = `${environment.API_URL}/alert/send`; // MOCK: desconectado del backend

  // constructor(private http: HttpClient) {} // MOCK: desconectado del backend
  constructor() {}

  // Enviar alerta al correo electrónico especificado
  sendAlert(email: string): Observable<string> {
    // const body = { email: email };
    // return this.http.post<string>(this.apiUrl, body, this.httpOptions())
    //   .pipe(
    //     catchError(this.handleError)
    //   );

    // MOCK
    return of(`Alerta enviada a ${email} (mock)`).pipe(delay(MOCK_DELAY));
  }

  // MOCK: desconectado del backend
  // // Opciones de cabecera para las peticiones
  // private httpOptions() {
  //   return {
  //     headers: new HttpHeaders({
  //       'Content-Type': 'application/json'
  //     })
  //   };
  // }
  //
  // // Manejo de errores
  // private handleError(error: any): Observable<never> {
  //   console.error('Error en la petición HTTP:', error);
  //   throw new Error('Ocurrió un error al enviar la alerta. Verifica la consola para más detalles.');
  // }
}
