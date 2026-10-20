// Asistencia: toma por clase (docente), seguimiento (estudiante y padre), resumen diario y licencias (dirección)
const { abrirNavegador } = require('./lib');

const LUNES_0830 = new Date(2026, 9, 19, 8, 30, 0);

module.exports = async function asistencia({ verificar }) {
  const b = await abrirNavegador({ fecha: LUNES_0830 });
  // Marca a un estudiante (por nombre) con un estado P/A/T/L
  const marcar = (nombre, estado) => b.evaluar(`(() => {
    const fila = [...document.querySelectorAll('.estudiante')].find(f => f.querySelector('.nombre').textContent.trim() === ${JSON.stringify(nombre)});
    fila.querySelector('.estado-${estado}').click(); return true; })()`);
  const nombreFila = (n) => b.evaluar(`document.querySelectorAll('.estudiante .nombre')[${n}].textContent.trim()`);
  const minutos = (nombre, valor) => b.evaluar(`(() => {
    const fila = [...document.querySelectorAll('.estudiante')].find(f => f.querySelector('.nombre').textContent.trim() === ${JSON.stringify(nombre)});
    const i = fila.querySelector('.tarde input'); i.value = '${valor}'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  const fila = (nombre) => b.evaluar(`[...document.querySelectorAll('.estudiante')].find(f => f.querySelector('.nombre').textContent.trim() === ${JSON.stringify(nombre)})?.textContent ?? ''`);
  try {
    // ---------- Docente: tomar asistencia ----------
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/asistencia');
    verificar('abre en la fecha de hoy', (await b.texto('h2.dia')).toLowerCase().includes('19 de octubre'));
    verificar('muestra sus 3 clases del lunes', (await b.evaluar(`document.querySelectorAll('button.clase').length`)) === 3);
    verificar('la primera clase está pendiente de tomar', (await b.texto('.lista .cabecera .ui-badge')).includes('Pendiente'));
    verificar('lista los 32 estudiantes de 3ro A', (await b.evaluar(`document.querySelectorAll('.estudiante').length`)) === 32);

    await marcar('Luis Mamani', 'ausente');
    const tolerado = await nombreFila(1) === 'Luis Mamani' ? await nombreFila(2) : await nombreFila(1);
    const tarde = await nombreFila(3);
    await marcar(tolerado, 'atraso');
    await b.esperar(200);
    await minutos(tolerado, '5');
    await marcar(tarde, 'atraso');
    await b.esperar(200);
    await minutos(tarde, '20');
    await b.esperar(300);
    verificar('avisa cuando el atraso está dentro de la tolerancia', (await fila(tolerado)).includes('Dentro de la tolerancia'));
    await b.clic('.pie button', 'Guardar');
    await b.esperar(1200);
    verificar('queda marcada como tomada', (await b.texto('.lista .cabecera .ui-badge')).includes('tomada'));
    const chips = await b.evaluar(`[...document.querySelectorAll('.conteo .ui-badge')].map(c => c.textContent.trim())`);
    verificar('el atraso tolerado se guarda como presente', chips.join('|') === '30 presentes|1 ausentes|1 atrasos|0 con licencia', chips.join(' | '));

    // Tolerancia
    await b.clic('.tolerancia button', 'Cambiar');
    await b.esperar(200);
    await b.escribir('.tolerancia input', '3');
    await b.clic('.tolerancia button', 'Guardar');
    await b.esperar(900);
    verificar('el docente cambia su tolerancia', (await b.texto('.tolerancia')).includes('3 minutos'));

    // Una fecha anterior ya tomada: miércoles 14, Luis llegó 10 minutos tarde
    await b.escribir('.fecha input', '2026-10-14');
    await b.evaluar(`document.querySelector('.fecha input').dispatchEvent(new Event('change', { bubbles: true }))`);
    await b.esperar(1200);
    verificar('una clase pasada aparece como tomada', (await b.texto('.lista .cabecera .ui-badge')).includes('tomada'));
    verificar('muestra el atraso registrado de Luis', (await b.evaluar(`(() => { const f = [...document.querySelectorAll('.estudiante')].find(x => x.querySelector('.nombre').textContent.trim() === 'Luis Mamani'); return f.querySelector('.tarde input')?.value; })()`)) === '10');

    // ---------- Estudiante: mi asistencia ----------
    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/estudiante/asistencia');
    const indicadores = await b.evaluar(`[...document.querySelectorAll('.indicador strong')].map(s => s.textContent.trim())`);
    verificar('Luis: 1 falta, 1 atraso y 2 clases con licencia', indicadores.slice(1).join('|') === '1|1|2', indicadores.join(' | '));
    verificar('el viernes 9 figura con licencia', (await b.evaluar(`[...document.querySelectorAll('.dias li')].find(li => li.textContent.includes('9'))?.textContent ?? ''`)).includes('Con licencia'));

    // ---------- Padre: seguimiento y licencias ----------
    await b.sesion('padre');
    await b.ir('/colegio-san-jose/padre/asistencia');
    verificar('el padre ve la asistencia de su hijo', (await b.texto('app-page-header h1')) === 'Asistencia de Luis Mamani');
    const avisos = await b.evaluar(`[...document.querySelectorAll('.avisos li strong')].map(s => s.textContent.trim())`);
    verificar('avisos de falta y de atraso', avisos.includes('Faltó a algunas clases') && avisos.includes('Con atraso'), avisos.join(' | '));
    verificar('lista sus licencias (1 pendiente y 1 aprobada)', (await b.evaluar(`document.querySelectorAll('.licencias li').length`)) === 2);
    await b.clic('app-page-header button', 'Solicitar licencia');
    await b.esperar(400);
    await b.escribir('#lic-desde', '2026-10-26');
    await b.escribir('#lic-hasta', '2026-10-26');
    await b.escribir('#lic-motivo', 'Médico');
    await b.clic('app-drawer footer button', 'Enviar');
    await b.esperar(400);
    verificar('exige un motivo de al menos 10 caracteres', (await b.texto('app-drawer .ui-error')).includes('10 caracteres'));
    await b.escribir('#lic-motivo', 'Control médico anual con el pediatra');
    await b.clic('app-drawer footer button', 'Enviar');
    await b.esperar(1200);
    verificar('la nueva licencia aparece como pendiente', (await b.evaluar(`document.querySelectorAll('.licencias li').length`)) === 3);

    // ---------- Dirección: resumen diario y licencias ----------
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/direccion/asistencia/estudiantes');
    verificar('abre en el último día con asistencia (viernes 16)', (await b.texto('h2.dia')).includes('16 de octubre'));
    verificar('3ro A tiene detalle con sus 32 estudiantes', (await b.evaluar(`document.querySelectorAll('.estudiantes li').length`)) === 32);
    await b.escribir('.fecha input', '2026-10-09');
    await b.evaluar(`document.querySelector('.fecha input').dispatchEvent(new Event('change', { bubbles: true }))`);
    await b.esperar(800);
    const luis = await b.evaluar(`[...document.querySelectorAll('.estudiantes li')].find(li => li.textContent.includes('Luis Mamani'))?.textContent ?? ''`);
    verificar('el resumen del viernes 9 muestra a Luis con licencia', luis.includes('Con licencia'), luis);

    await b.ir('/colegio-san-jose/direccion/asistencia/licencias');
    verificar('hay 2 licencias pendientes', (await b.texto('.ui-tab.activa .contador')) === '2');
    await b.evaluar(`[...document.querySelectorAll('.licencia')].find(l => l.textContent.includes('Viaje familiar')).querySelector('footer .ui-btn:not(.ui-btn--peligro)').click()`);
    await b.esperar(300);
    await b.clic('app-drawer footer button', 'Aprobar');
    await b.esperar(1000);
    verificar('aprobar quita la licencia de pendientes', (await b.texto('.ui-tab.activa .contador')) === '1');
    await b.evaluar(`document.querySelector('.licencia footer .ui-btn--peligro').click()`);
    await b.esperar(300);
    await b.clic('app-drawer footer button', 'Rechazar');
    await b.esperar(500);
    verificar('rechazar exige un motivo', await b.evaluar(`!!document.querySelector('app-drawer .panel')`));
    await b.escribir('#lic-comentario', 'El campeonato no cuenta como licencia; coordinar con Educación Física.');
    await b.clic('app-drawer footer button', 'Rechazar');
    await b.esperar(1000);
    verificar('ya no quedan licencias pendientes', (await b.texto('.ui-tab.activa .contador')) === '0');
  } finally {
    await b.cerrar();
  }
};
