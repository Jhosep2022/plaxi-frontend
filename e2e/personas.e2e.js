// Personas: docentes, estudiantes, padres / tutores e inscripciones (dirección)
const { abrirNavegador } = require('./lib');

module.exports = async function personas({ verificar }) {
  const b = await abrirNavegador({ fecha: new Date(2026, 9, 19, 9, 0, 0) });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const filas = () => b.evaluar(`document.querySelectorAll('.ui-tabla tbody tr:not(:has(.vacio))').length`);
  const indicadores = () => b.evaluar(`[...document.querySelectorAll('.indicador strong')].map(s => s.textContent.trim()).join('|')`);
  const fila = (texto) => b.evaluar(`[...document.querySelectorAll('.ui-tabla tbody tr')].find(tr => tr.textContent.includes(${JSON.stringify(texto)}))?.innerText.replace(/\\s+/g, ' ') ?? ''`);
  const editarFila = (texto) => b.evaluar(`[...document.querySelectorAll('.ui-tabla tbody tr')].find(tr => tr.textContent.includes(${JSON.stringify(texto)}))?.querySelector('button[aria-label^="Editar"]')?.click() ?? false`);
  const eliminarFila = (texto) => b.evaluar(`[...document.querySelectorAll('.ui-tabla tbody tr')].find(tr => tr.textContent.includes(${JSON.stringify(texto)}))?.querySelector('button[aria-label^="Eliminar"]')?.click() ?? false`);
  const guardarDrawer = async () => { await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')].at(-1).click()`); await b.esperar(1000); };
  const cupo = (curso) => b.evaluar(`[...document.querySelectorAll('.paralelo')].find(p => p.querySelector('strong').textContent.trim() === ${JSON.stringify(curso)})?.querySelector('.cupo').textContent.trim()`);
  try {
    await b.sesion('direccion');

    // ---------- Docentes ----------
    await b.ir('/colegio-san-jose/direccion/personas/docentes', 3000);
    verificar('7 docentes activos y 1 de baja', (await indicadores()) === '7|7|0|1', await indicadores());
    verificar('María muestra sus materias y que tiene cuenta', (await fila('María Fernández')).includes('Física · 3ro A') && (await fila('María Fernández')).includes('Con cuenta'));
    await b.clic('.ui-tab', 'De baja');
    await b.esperar(200);
    verificar('la pestaña "De baja" muestra a Hugo Salazar', (await filas()) === 1 && (await fila('Hugo')).includes('Hugo Salazar'));
    await b.clic('.ui-tab', 'Activos');

    await b.clic('app-page-header button', 'Nuevo docente');
    await b.esperar(300);
    await b.escribir('#doc-nombre', 'Pamela Ríos');
    await b.escribir('#doc-ci', '4876512');
    await b.escribir('#doc-esp', 'Biología');
    await b.escribir('#doc-tel', '123');
    await guardarDrawer();
    verificar('valida el teléfono', (await cuerpo()).includes('Debe tener 7 u 8 dígitos'));
    await b.escribir('#doc-tel', '71112233');
    await guardarDrawer();
    verificar('no deja repetir un CI', (await cuerpo()).includes('El CI 4876512 ya está registrado a nombre de María Fernández'));
    await b.escribir('#doc-ci', '8123456');
    await guardarDrawer();
    verificar('registra al nuevo docente (sin materias)', (await fila('Pamela Ríos')).includes('Sin materias') && (await indicadores()) === '8|7|1|1', await indicadores());

    await editarFila('María Fernández');
    await b.esperar(300);
    await b.evaluar(`(() => { const c = document.querySelector('#doc-activo'); c.click(); return c.checked; })()`);
    await guardarDrawer();
    verificar('no deja dar de baja a un docente con materias', (await cuerpo()).includes('Tiene 6 materias asignadas'));
    await b.evaluar(`[...document.querySelectorAll('app-drawer footer button')][0].click()`);

    await b.navegarEnApp('/colegio-san-jose/direccion/academico/asignaciones', 2000);
    const opciones = await b.evaluar(`[...document.querySelector('.docente select').options].map(o => o.textContent.trim()).join('|')`);
    verificar('el docente nuevo aparece en Asignación docente y el de baja no', opciones.includes('Pamela Ríos') && !opciones.includes('Hugo Salazar'), opciones);

    // ---------- Estudiantes ----------
    await b.navegarEnApp('/colegio-san-jose/direccion/personas/estudiantes', 2000);
    verificar('245 inscritos, 4 sin inscribir y 4 sin tutor', (await indicadores()) === '245|4|4', await indicadores());
    await b.elegir('.filtros select', 'sin-curso');
    await b.esperar(200);
    verificar('el filtro "Sin inscribir" muestra 4 estudiantes', (await filas()) === 4);
    verificar('Luis Mamani tiene a su madre registrada', (await (async () => { await b.elegir('.filtros select', 'todos'); await b.escribir('.buscar input', 'luis'); await b.esperar(200); return fila('Luis Mamani'); })()).includes('Rosa Quispe (Madre)'));
    await b.escribir('.buscar input', '');

    await b.clic('app-page-header button', 'Nuevo estudiante');
    await b.esperar(300);
    await b.escribir('#est-nombre', 'Tadeo Vino');
    await b.escribir('#est-ci', '9555111');
    await b.escribir('#est-nac', '2025-01-10');
    await guardarDrawer();
    verificar('valida la edad del estudiante', (await cuerpo()).includes('La edad debe estar entre 3 y 25 años'));
    await b.escribir('#est-nac', '2012-03-04');
    await b.elegir('#est-curso', '5');
    await guardarDrawer();
    verificar('registra al estudiante en 3ro A', (await fila('Tadeo Vino')).includes('3ro A') && (await indicadores()) === '246|4|5', await indicadores());

    // ---------- Padres y tutores ----------
    await b.navegarEnApp('/colegio-san-jose/direccion/personas/padres', 2000);
    await b.escribir('.buscar input', 'luis mamani');
    await b.esperar(200);
    verificar('se busca por el nombre del hijo', (await filas()) === 1 && (await fila('Rosa Quispe')).includes('Luis Mamani · 3ro A · Madre'));
    verificar('Rosa Quispe usa la app', (await fila('Rosa Quispe')).includes('Con cuenta'));
    await eliminarFila('Rosa Quispe');
    await b.esperar(800);
    verificar('no deja eliminar a un padre con cuenta', (await cuerpo()).includes('tiene una cuenta activa'));
    await b.escribir('.buscar input', '');

    await b.clic('app-page-header button', 'Nuevo padre o tutor');
    await b.esperar(300);
    await b.escribir('#pad-nombre', 'Jaime Vino Paz');
    await b.escribir('#pad-ci', '6543210');
    await b.escribir('#pad-tel', '76543210');
    await b.elegir('#pad-hijo-0', String(await b.evaluar(`[...document.querySelectorAll('#pad-hijo-0 option')].find(o => o.textContent.trim() === 'Tadeo Vino').value`)));
    await b.elegir('#pad-par-0', 'padre');
    await guardarDrawer();
    verificar('registra al padre con su hijo', (await fila('Jaime Vino Paz')).includes('Tadeo Vino · 3ro A · Padre'));
    verificar('baja la cantidad de estudiantes sin tutor', (await indicadores()).endsWith('|4'), await indicadores());

    // ---------- Inscripciones ----------
    await b.navegarEnApp('/colegio-san-jose/direccion/personas/inscripciones', 2000);
    verificar('3ro A tiene 33 de 35 (incluye al estudiante nuevo)', (await cupo('3ro A')) === '33 de 35', await cupo('3ro A'));
    verificar('4 estudiantes sin inscribir', (await b.evaluar(`document.querySelectorAll('.pendientes li').length`)) === 4);
    // Llenar 2da sección A (22 de 25) con 3 estudiantes nuevos
    for (let i = 0; i < 3; i++) {
      await b.clic('.pendientes li button', 'Inscribir en 2da sección A');
      await b.esperar(1200);
    }
    verificar('2da sección A queda llena', (await cupo('2da sección A')) === '25 de 25 · lleno', await cupo('2da sección A'));
    verificar('con el paralelo lleno ya no deja inscribir', await b.evaluar(`document.querySelector('.pendientes li button').disabled`) && (await cuerpo()).includes('está lleno'));

    await b.evaluar(`[...document.querySelectorAll('.paralelo')].find(p => p.querySelector('strong').textContent.trim() === '3ro A').click()`);
    await b.esperar(300);
    await b.evaluar(`(() => { const li = [...document.querySelectorAll('.inscritos li')].find(l => l.textContent.includes('Tadeo Vino')); const s = li.querySelector('select'); s.value = '6'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await b.esperar(1200);
    verificar('cambia de paralelo (3ro A → 3ro B) con confirmación', (b.dialogos.at(-1) ?? '').includes('de 3ro A a 3ro B') && (await cupo('3ro A')) === '32 de 35' && (await cupo('3ro B')) === '31 de 35',
      `${await cupo('3ro A')} / ${await cupo('3ro B')}`);
    await b.evaluar(`[...document.querySelectorAll('.inscritos li')].find(l => l.textContent.includes('Luis Mamani')).querySelector('button').click()`);
    await b.esperar(1200);
    verificar('retira a un estudiante y queda sin inscribir', (await cupo('3ro A')) === '31 de 35' && (await b.texto('.pendientes')).includes('Luis Mamani'));
    verificar('sin errores en la consola', b.errores.length === 0, b.errores.join(' | '));
  } finally {
    await b.cerrar();
  }
};
