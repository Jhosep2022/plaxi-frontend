// Reportes de la dirección: rendimiento académico, asistencia de estudiantes y puntualidad del personal
const { abrirNavegador } = require('./lib');

module.exports = async function reportes({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const indicadores = () => b.evaluar(`[...document.querySelectorAll('.indicador strong')].map(s => s.textContent.trim()).join('|')`);
  const barras = (seccion) => b.evaluar(`[...document.querySelectorAll('.seccion')].find(s => s.querySelector('h2').textContent.includes(${JSON.stringify(seccion)}))
    ?.querySelectorAll('app-barras .fila, app-columnas .columna').length ?? 0`);
  const fila = (tabla, texto) => b.evaluar(`[...document.querySelectorAll('#${tabla} tbody tr')].find(tr => tr.textContent.includes(${JSON.stringify(texto)}))?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  // Captura las descargas CSV en lugar de bajarlas
  const espiarDescargas = () => b.evaluar(`(() => { window.__descargas = []; const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (this.download) window.__descargas.push(this.download); else original.call(this); }; return true; })()`);
  const fechaRango = async (id, valor) => {
    await b.evaluar(`(() => { const el = document.querySelector('#${id}'); el.value = '${valor}'; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await b.esperar(1200);
  };
  try {
    await b.sesion('direccion');

    // ---------- Rendimiento académico ----------
    await b.ir('/colegio-san-jose/direccion/reportes', 4500);
    verificar('"Reportes" abre el rendimiento académico', (await b.texto('app-page-header h1')) === 'Rendimiento académico');
    verificar('por defecto muestra el periodo en curso (provisional)', (await cuerpo()).includes('3er Trimestre todavía no está cerrado'));
    verificar('muestra un promedio por cada curso con notas (7)', (await barras('Promedio por curso')) === 7, await barras('Promedio por curso'));
    verificar('la distribución de notas tiene 8 rangos', (await barras('Distribución')) === 8);
    await b.elegir('app-page-header select', '1');
    await b.esperar(500);
    verificar('el 2do Trimestre está cerrado (sin aviso de provisional)', !(await cuerpo()).includes('todavía no está cerrado'));
    verificar('Luis Mamani aparece en riesgo por Física (45)', (await fila('tabla-riesgo', 'Luis Mamani')).includes('Física · 45'), await fila('tabla-riesgo', 'Luis Mamani'));
    await b.elegir('app-page-header select', '-1');
    await b.esperar(500);
    verificar('en el promedio anual Luis ya no está en riesgo', (await fila('tabla-riesgo', 'Luis Mamani')) === '');
    await espiarDescargas();
    await b.clic('.seccion .exportar', 'Exportar CSV');
    verificar('exporta las materias con reprobados a CSV', (await b.evaluar('window.__descargas[0] ?? ""')) === 'materias-con-reprobados-Promedio anual.csv', await b.evaluar('window.__descargas[0]'));

    // ---------- Asistencia ----------
    await b.navegarEnApp('/colegio-san-jose/direccion/reportes/asistencia', 2000);
    verificar('asistencia general de las últimas dos semanas', (await indicadores()).startsWith('97%|37|72|2'), await indicadores());
    verificar('muestra los cursos con asistencia tomada (3ro A y 3ro B)', (await barras('por curso')) === 2);
    verificar('una columna por día de clases (10)', (await barras('por día')) === 10);
    verificar('las fechas del gráfico se leen bien', (await b.evaluar(`[...document.querySelectorAll('app-columnas .etiquetas span')].map(s => s.textContent.trim()).join('|')`)).startsWith('5 oct|6 oct|7 oct'));
    await fechaRango('rep-desde', '2026-10-12');
    verificar('al cambiar el rango se recalcula (5 días)', (await cuerpo()).includes('en 5 días de clase') && (await barras('por día')) === 5);
    verificar('Luis figura con su falta y su atraso', (await (async () => { await b.clic('.ver-mas', 'Ver'); await b.esperar(200); return fila('tabla-faltas', 'Luis Mamani'); })()).includes('3ro A 1 1'), await fila('tabla-faltas', 'Luis Mamani'));
    await espiarDescargas();
    await b.clic('.seccion .exportar', 'Exportar CSV');
    verificar('exporta la tabla de faltas a CSV', (await b.evaluar('window.__descargas[0] ?? ""')) === 'asistencia-2026-10-12-a-2026-10-19.csv');

    // ---------- Puntualidad ----------
    await b.navegarEnApp('/colegio-san-jose/direccion/reportes/puntualidad', 2000);
    verificar('María: 1 atraso de 17 min', (await fila('tabla-puntualidad', 'María Fernández')).includes('1 (17 min)'), await fila('tabla-puntualidad', 'María Fernández'));
    verificar('el docente menos puntual aparece primero', (await b.evaluar(`document.querySelector('#tabla-puntualidad tbody tr strong').textContent.trim()`)) === 'Raúl Choque');
    verificar('hoy no cuenta como falta', (await indicadores()).endsWith('|0'), await indicadores());
    await fechaRango('rep-desde', '2026-10-14');
    await fechaRango('rep-hasta', '2026-10-14');
    verificar('solo el 14 de octubre: María llegó tarde', (await fila('tabla-puntualidad', 'María Fernández')).includes('1 0 1 (17 min) 0 0%'), await fila('tabla-puntualidad', 'María Fernández'));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
