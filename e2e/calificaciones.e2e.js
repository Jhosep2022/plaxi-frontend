// Calificaciones: planilla del docente, notas del estudiante y padre, escala, cierre de periodos y boletines
const { abrirNavegador } = require('./lib');

const LUNES = new Date(2026, 9, 19, 9, 0, 0);

module.exports = async function calificaciones({ verificar }) {
  const b = await abrirNavegador({ fecha: LUNES });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const encabezados = () => b.evaluar(`[...document.querySelectorAll('.tabla th.actividad .nombre-act')].map(t => t.textContent.trim())`);
  const boton = () => b.texto('.pie button');
  // Casilla de la 1ra fila en la columna de una actividad
  const casilla = (actividad) => `(() => {
    const cols = [...document.querySelectorAll('.tabla tbody tr:first-child td.celda')];
    const i = [...document.querySelectorAll('.tabla th.actividad .nombre-act')].findIndex(t => t.textContent.trim() === ${JSON.stringify(actividad)});
    return cols[i].querySelector('input');
  })()`;
  const escribirNota = (actividad, valor) => b.evaluar(`(() => { const el = ${casilla(actividad)}; el.value = ${JSON.stringify(valor)};
    el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  const promedioHacer = () => b.evaluar(`[...document.querySelectorAll('.tabla tbody tr:first-child td.prom')][2].textContent.trim()`);
  try {
    // ---------- Docente: planilla del periodo en curso ----------
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/calificaciones', 3500);
    verificar('abre la primera clase (Física · 3ro A)', (await b.texto('.planilla h3')) === 'Física · 3ro A');
    verificar('el periodo en curso es el 3er Trimestre', (await b.texto('.ui-tab.activa')) === '3er Trimestre');
    verificar('muestra la ponderación del colegio', (await b.evaluar(`[...document.querySelectorAll('.insignias .ui-badge')].map(s => s.textContent.trim()).join('|')`)).includes('Ser 10%|Saber 45%|Hacer 40%|Decidir 5%'));
    verificar('lista las actividades del periodo', (await encabezados()).join('|') === 'Examen parcial|Práctica 1|Práctica 2|Práctica 3', (await encabezados()).join('|'));
    verificar('la Práctica 3 todavía no tiene notas', (await b.evaluar(`${casilla('Práctica 3')}.value`)) === '');

    await escribirNota('Práctica 3', '150');
    await b.esperar(200);
    verificar('una nota fuera de rango se marca en rojo', await b.evaluar(`${casilla('Práctica 3')}.classList.contains('invalida')`));
    verificar('y no deja guardar', (await b.evaluar(`document.querySelector('.pie button').disabled`)) && (await b.texto('.pie .ui-ayuda')).includes('fuera de rango'));

    const antes = await promedioHacer();
    await escribirNota('Práctica 3', '90');
    await b.esperar(200);
    verificar('el promedio de Hacer se recalcula en vivo', (await promedioHacer()) !== antes, `${antes} → ${await promedioHacer()}`);
    verificar('el botón cuenta los cambios', (await boton()) === 'Guardar 1 nota', await boton());
    await b.clic('.pie button', 'Guardar');
    await b.esperar(2000);
    verificar('guarda la nota', (await cuerpo()).includes('1 nota guardada') && (await boton()) === 'Sin cambios');

    // Nueva actividad: la fecha debe estar dentro del periodo
    await b.clic('.cabecera button', 'Nueva actividad');
    await b.esperar(300);
    await b.escribir('#act-nombre', 'Examen sorpresa');
    await b.elegir('#act-criterio', '2');
    await b.escribir('#act-fecha', '2026-06-01');
    await b.clic('app-drawer footer button', 'Agregar actividad');
    await b.esperar(300);
    verificar('rechaza una fecha fuera del periodo', (await cuerpo()).includes('Debe estar dentro del 3er Trimestre'));
    await b.escribir('#act-fecha', '2026-10-19');
    await b.clic('app-drawer footer button', 'Agregar actividad');
    await b.esperar(2000);
    verificar('agrega la actividad en el criterio Saber', (await encabezados()).join('|') === 'Examen parcial|Examen sorpresa|Práctica 1|Práctica 2|Práctica 3', (await encabezados()).join('|'));

    // Periodo cerrado: solo lectura
    await b.clic('.ui-tab', '2do Trimestre');
    await b.esperar(500);
    verificar('el 2do Trimestre está cerrado y es de solo lectura',
      (await b.texto('.insignias')).includes('Periodo cerrado') && (await b.evaluar(`document.querySelectorAll('.tabla input').length`)) === 0);
    verificar('en un periodo cerrado no se pueden agregar actividades', !(await cuerpo()).includes('Nueva actividad'));

    // ---------- Estudiante ----------
    await b.sesion('estudiante');
    await b.ir('/colegio-san-jose/estudiante/calificaciones', 3500);
    const finalDe = (materia) => b.evaluar(`[...document.querySelectorAll('.materia')].find(m => m.querySelector('.titulo strong').textContent.trim() === ${JSON.stringify(materia)})?.querySelector('.final')`
      + `?.textContent.trim() ?? ''`);
    verificar('muestra las 6 materias de 3ro A', (await b.evaluar(`document.querySelectorAll('.materia').length`)) === 6);
    verificar('aviso de notas provisionales en el periodo en curso', (await cuerpo()).includes('las notas son provisionales'));
    verificar('Física en el 3er Trimestre: 62', (await finalDe('Física')) === '62', await finalDe('Física'));
    await b.clic('.ui-tab', '2do Trimestre');
    await b.esperar(300);
    verificar('Física en el 2do Trimestre: 45 (reprobada)', (await finalDe('Física')) === '45' &&
      (await b.evaluar(`[...document.querySelectorAll('.materia.en-riesgo .titulo strong')].map(s => s.textContent.trim()).join()`)) === 'Física');
    await b.clic('.ui-tab', 'Boletín');
    await b.esperar(300);
    verificar('el boletín es de Luis Mamani (3ro A)', (await b.texto('app-boletin .datos')).includes('Luis Mamani') && (await b.texto('app-boletin .datos')).includes('3ro A'));
    const fisica = await b.evaluar(`[...document.querySelectorAll('app-boletin tbody tr')].find(tr => tr.textContent.includes('Física'))?.innerText.replace(/\\s+/g, ' ') ?? ''`);
    verificar('el boletín muestra Física 70 · 45 · 62 y promedio 59', fisica.includes('70 45 62 59'), fisica);
    verificar('tiene el botón para imprimir o guardar PDF', (await cuerpo()).includes('Imprimir / PDF'));

    // ---------- Padre ----------
    await b.sesion('padre');
    await b.ir('/colegio-san-jose/padre/calificaciones', 3500);
    verificar('el padre ve las calificaciones de su hijo', (await b.texto('app-page-header h1')) === 'Calificaciones de Luis Mamani');

    // ---------- Dirección: escala y ponderación ----------
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/direccion/calificaciones/escala');
    verificar('la escala por defecto es 100 / 51', (await b.evaluar(`document.querySelector('#es-max').value + '/' + document.querySelector('#es-apr').value`)) === '100/51');
    await b.escribir('#cr-pct-0', '20');
    await b.esperar(200);
    verificar('avisa si los pesos no suman 100%', (await b.texto('.total')).includes('Total: 110%'));
    await b.escribir('#cr-pct-1', '35');
    await b.esperar(200);
    await b.clic('app-page-header button', 'Guardar');
    await b.esperar(1000);
    verificar('guarda los nuevos pesos (Ser 20%, Saber 35%)', (await cuerpo()).includes('Escala y ponderación guardadas'));
    await b.escribir('#es-apr', '120');
    await b.esperar(200);
    verificar('la nota de aprobación no puede superar la máxima', (await cuerpo()).includes('No puede ser mayor que la nota máxima'));
    await b.escribir('#es-apr', '51');
    await b.clic('.criterio button', '');
    await b.esperar(200);
    await b.escribir('#cr-pct-0', '55');
    await b.clic('app-page-header button', 'Guardar');
    await b.esperar(1000);
    verificar('no deja quitar un criterio con actividades', (await cuerpo()).includes('"Ser" tiene actividades registradas'));

    // ---------- Dirección: cierre de periodos ----------
    await b.ir('/colegio-san-jose/direccion/calificaciones/periodos');
    const estados = () => b.evaluar(`[...document.querySelectorAll('.periodo .cabecera .ui-badge')].map(s => s.textContent.trim()).join('|')`);
    verificar('1er y 2do cerrados, 3ro en curso', (await estados()) === 'Cerrado|Cerrado|En curso', await estados());
    await b.clic('.periodo:nth-child(2) button', 'Reabrir');
    await b.esperar(1000);
    verificar('reabre el 2do Trimestre', (await estados()) === 'Cerrado|Terminado · sin cerrar|En curso', await estados());
    await b.clic('.periodo:nth-child(3) button', 'Cerrar periodo');
    await b.esperar(1000);
    verificar('al cerrar avisa las notas que faltan', (b.dialogos.at(-1) ?? '').includes('Faltan'), b.dialogos.at(-1));
    verificar('cierra el 3er Trimestre', (await estados()).endsWith('|Cerrado'), await estados());

    // ---------- Dirección: boletines ----------
    await b.ir('/colegio-san-jose/direccion/calificaciones/boletines', 3000);
    verificar('lista los 32 estudiantes de 3ro A', (await b.evaluar(`document.querySelectorAll('.ui-tabla tbody tr').length`)) === 32);
    await b.escribir('.buscar input', 'luis');
    await b.esperar(200);
    verificar('el buscador filtra por nombre', (await b.evaluar(`document.querySelectorAll('.ui-tabla tbody tr').length`)) === 1);
    await b.clic('.ui-tabla button', 'Ver boletín');
    await b.esperar(300);
    verificar('abre el boletín del estudiante', (await b.texto('app-boletin .datos')).includes('Luis Mamani'));
    await b.clic('button.volver', 'Volver');
    await b.esperar(300);
    await b.escribir('.buscar input', '');
    await b.elegir('.filtros select', '6');
    await b.esperar(2000);
    verificar('cambia de curso (3ro B, 30 estudiantes)', (await b.evaluar(`document.querySelectorAll('.ui-tabla tbody tr').length`)) === 30);
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
