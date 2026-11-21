// Distancia en metros entre dos coordenadas (fórmula de haversine)
export function distanciaMetros(
  a: { latitud: number; longitud: number },
  b: { latitud: number; longitud: number },
): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitud)) *
      Math.cos(rad(b.latitud)) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function distanciaLabel(metros: number): string {
  return metros < 1000
    ? `${metros} m`
    : `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

// Lee el contenido de un QR de marcación (null si no es de Aulix). Acepta el prefijo viejo quizwiz- por si una pantalla quedó abierta.
export function leerQr(
  texto: string,
): { puntoId: number; codigo: string } | null {
  const m = /^(?:aulix|quizwiz)-marcacion:(\d+):(\d{6})$/.exec(texto.trim());
  return m ? { puntoId: Number(m[1]), codigo: m[2] } : null;
}
