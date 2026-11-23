import { fechaBolivia, horaBolivia, saludoSegunHora } from './bolivia-time';

describe('hora de Bolivia', () => {
  it('un pago de las 22:30 del 16 sigue siendo del 16 (en UTC ya es el 17)', () => {
    expect(fechaBolivia('2026-11-17T02:30:00.000Z')).toBe('2026-11-16');
    expect(horaBolivia('2026-11-17T02:30:00.000Z')).toBe('22:30');
  });

  it('una fecha sin hora no cambia', () => {
    expect(fechaBolivia('2026-11-16')).toBe('2026-11-16');
    expect(horaBolivia('2026-11-16')).toBe('');
  });

  it('saluda según la hora de Bolivia', () => {
    expect(saludoSegunHora('Rosa', new Date('2026-11-16T12:00:00Z'))).toBe('¡Buen día, Rosa!'); // 08:00
    expect(saludoSegunHora('Rosa', new Date('2026-11-16T19:00:00Z'))).toBe('¡Buenas tardes, Rosa!'); // 15:00
    expect(saludoSegunHora('Rosa', new Date('2026-11-17T02:00:00Z'))).toBe('¡Buenas noches, Rosa!'); // 22:00
  });
});
