// La API manda las fechas con hora en UTC ("2026-11-17T02:30:00.000Z"). Cortar el texto mostraba
// un pago de las 22:30 del 16 como del 17. Estas funciones las pasan a la hora de Bolivia.
// Una fecha sola ("2026-11-16") no tiene hora y se devuelve tal cual.
const ZONA = 'America/La_Paz';

const tieneHora = (valor: string) => valor.includes('T');

// "2026-11-16"
export function fechaBolivia(valor: string): string {
  if (!valor || !tieneHora(valor)) return valor?.slice(0, 10) ?? '';
  return new Date(valor).toLocaleDateString('en-CA', { timeZone: ZONA });
}

// "22:30"
export function horaBolivia(valor: string): string {
  if (!valor || !tieneHora(valor)) return '';
  return new Date(valor).toLocaleTimeString('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
}

// Hora del día en Bolivia (0 a 23), para el saludo
export function horaDelDiaBolivia(ahora = new Date()): number {
  return Number(ahora.toLocaleString('en-GB', { timeZone: ZONA, hour: '2-digit', hour12: false })) % 24;
}

// "¡Buen día!", "¡Buenas tardes!" o "¡Buenas noches!" según la hora de Bolivia
export function saludoSegunHora(nombre: string, ahora = new Date()): string {
  const hora = horaDelDiaBolivia(ahora);
  const saludo = hora >= 5 && hora < 12 ? 'Buen día' : hora >= 12 && hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  return `¡${saludo}, ${nombre}!`;
}
