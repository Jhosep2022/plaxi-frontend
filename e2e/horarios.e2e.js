// Horarios y jornada escolar (dirección): choques, guardado y cambios de jornada
const { abrirNavegador } = require('./lib');

module.exports = async function horarios({ verificar }) {
  const b = await abrirNavegador();
  const guardarDrawer = `[...document.querySelectorAll('app-drawer footer button')].find(x => x.textContent.includes('Guardar'))`;
  const elegirParalelo = (nombre) => b.evaluar(`[...document.querySelectorAll('.paralelo')].find(x => x.textContent.includes('${nombre}')).click()`);
  try {
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/direccion/academico/horarios');
    await elegirParalelo('3ro A');
    await b.esperar(400);
    const ocupacion = await b.texto('.cabecera > .ui-badge');
    verificar('3ro A muestra 15 de 20 periodos ocupados', ocupacion.startsWith('15 de 20'), ocupacion);
    verificar('la grilla tiene una fila de recreo', (await b.evaluar(`document.querySelectorAll('.fila-recreo').length`)) === 1);

    // Choque de docente: lunes 2º periodo -> Matemáticas; María ya está en 3ro B a esa hora
    await b.evaluar(`document.querySelector('button.clase[aria-label^="Lenguaje, Lunes 09:00"]').click()`);
    await b.esperar(400);
    await b.elegir('#hor-materia', '7');
    await b.esperar(300);
    const choqueDocente = await b.texto('.choque');
    verificar('detecta choque de docente con 3ro B', choqueDocente.includes('María Fernández') && choqueDocente.includes('3ro B'), choqueDocente);
    verificar('no deja guardar con choque', await b.evaluar(`${guardarDrawer}.disabled`));

    // Choque de aula: vuelve a Lenguaje pero en Aula 14 (la usa 3ro B a esa hora)
    await b.elegir('#hor-materia', '10');
    await b.elegir('#hor-aula', '2');
    await b.esperar(300);
    const choqueAula = await b.texto('.choque');
    verificar('detecta choque de aula (Aula 14)', choqueAula.includes('Aula 14') && choqueAula.includes('3ro B'), choqueAula);
    await b.evaluar(`document.querySelector('app-drawer .cerrar').click()`);
    await b.esperar(300);

    // Agregar una clase sin choques: jueves 1er periodo -> Matemáticas
    await b.evaluar(`document.querySelector('button.vacia[aria-label="Agregar clase el Jueves a las 07:30"]').click()`);
    await b.esperar(400);
    await b.elegir('#hor-materia', '7');
    await b.esperar(300);
    verificar('sin choques para jueves 07:30', (await b.evaluar(`document.querySelectorAll('.choque').length`)) === 0);
    verificar('muestra el docente de la materia', (await b.texto('app-drawer .ui-ayuda strong')) === 'María Fernández');
    await b.evaluar(`${guardarDrawer}.click()`);
    await b.esperar(1500);
    verificar('la clase nueva se guarda (16 de 20)', (await b.texto('.cabecera > .ui-badge')).startsWith('16 de 20'));

    // Jornada escolar (se navega dentro de la app para conservar la clase agregada)
    await b.navegarEnApp('/colegio-san-jose/direccion/institucion/jornada');
    verificar('mañana con 90 min da 4 periodos', (await b.texto('.turno .ui-badge')).startsWith('4 periodos'));
    await b.evaluar(`[...document.querySelectorAll('.chip')].find(x => x.textContent.trim() === '45 min').click()`);
    await b.esperar(300);
    verificar('con 45 min da 8 periodos', (await b.texto('.turno .ui-badge')).startsWith('8 periodos'));
    await b.evaluar(`document.querySelectorAll('.dia input').forEach(i => { if (i.checked) i.click(); })`);
    await b.esperar(300);
    verificar('exige al menos un día', (await b.evaluar(`document.body.innerText`)).includes('Elige al menos un día'));
    await b.evaluar(`document.querySelectorAll('.dia input').forEach((i, n) => { if (n < 5 && !i.checked) i.click(); })`);
    await b.evaluar(`[...document.querySelectorAll('.chip')].find(x => x.textContent.trim() === '1 h 30 min').click()`);
    await b.escribir('#fin-0', '12:30');
    await b.esperar(300);
    verificar('fin 12:30 deja 3 periodos', (await b.texto('.turno .ui-badge')).startsWith('3 periodos'));
    await b.clic('app-page-header button', 'Guardar');
    await b.esperar(1500);
    // Se quitan los 4º periodos de 3ro A (lunes y martes) y la clase nueva del jueves sigue
    verificar('avisa cuántas clases quedan fuera', b.dialogos.some((d) => d.includes('2 clase(s)')), b.dialogos[0] ?? 'sin diálogo');

    await b.navegarEnApp('/colegio-san-jose/direccion/academico/horarios');
    await elegirParalelo('3ro A');
    await b.esperar(400);
    const final = await b.texto('.cabecera > .ui-badge');
    verificar('el horario se ajusta a la nueva jornada (14 de 15)', final.startsWith('14 de 15'), final);
  } finally {
    await b.cerrar();
  }
};
