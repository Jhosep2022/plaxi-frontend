import { SEGUNDOS_POR_CODIGO } from '../models/marcacion.model';

// Distancia en metros entre dos coordenadas (fórmula de haversine)
export function distanciaMetros(a: { latitud: number; longitud: number }, b: { latitud: number; longitud: number }): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function distanciaLabel(metros: number): string {
  return metros < 1000 ? `${metros} m` : `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

// Ventana de tiempo actual del código rotativo
export const ventanaActual = (ahora = Date.now()): number => Math.floor(ahora / 1000 / SEGUNDOS_POR_CODIGO);

export const segundosRestantes = (ahora = Date.now()): number => SEGUNDOS_POR_CODIGO - (Math.floor(ahora / 1000) % SEGUNDOS_POR_CODIGO);

// Código de 6 dígitos de un punto en una ventana de tiempo (hash FNV-1a del secreto + ventana).
// MOCK: en producción lo calcularía el servidor con un HMAC (como los códigos de doble factor).
export function codigoDeVentana(secreto: string, ventana: number): string {
  let h = 2166136261;
  const texto = `${secreto}:${ventana}`;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return String((h >>> 0) % 1000000).padStart(6, '0');
}

// Contenido del QR: identifica el punto y el código vigente
export const contenidoQr = (puntoId: number, codigo: string): string => `quizwiz-marcacion:${puntoId}:${codigo}`;

// Lee el contenido de un QR de marcación (null si no es de QuizWiz)
export function leerQr(texto: string): { puntoId: number; codigo: string } | null {
  const m = /^quizwiz-marcacion:(\d+):(\d{6})$/.exec(texto.trim());
  return m ? { puntoId: Number(m[1]), codigo: m[2] } : null;
}
