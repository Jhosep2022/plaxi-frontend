import { sumarDias } from './asistencia';

// Descarga una tabla como CSV para abrirla en Excel (separador ";" y BOM para los acentos)
export function descargarCsv(nombre: string, encabezados: string[], filas: (string | number | null)[][]): void {
  const celda = (v: string | number | null) => {
    const texto = v === null ? '' : String(v);
    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const contenido = [encabezados, ...filas].map((f) => f.map(celda).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombre}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

// Fechas (YYYY-MM-DD) entre dos días, ambos incluidos
export function fechasEntre(desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  for (let f = desde; f <= hasta && fechas.length < 400; f = sumarDias(f, 1)) fechas.push(f);
  return fechas;
}

export const porcentaje = (parte: number, total: number): number => (total ? Math.round((parte / total) * 100) : 0);
