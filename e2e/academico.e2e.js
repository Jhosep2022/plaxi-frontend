// Académico (dirección): aulas, materias, gestión y asignación docente
const { abrirNavegador } = require('./lib');

module.exports = async function academico({ verificar }) {
  const b = await abrirNavegador();
  try {
    await b.sesion('direccion');

    // Aulas: validación, crear y que aparezca en la grilla
    await b.ir('/colegio-san-jose/direccion/academico/aulas');
    verificar('abre el formulario de nueva aula', await b.clic('button.ui-btn', 'Nueva aula'));
    await b.esperar(300);
    await b.clic('app-drawer footer button', 'Crear aula');
    await b.esperar(300);
    verificar('valida el nombre obligatorio', (await b.texto('app-drawer .ui-error')).includes('nombre'));
    await b.escribir('#aula-nombre', 'Laboratorio de biología');
    await b.elegir('#aula-tipo', 'laboratorio');
    await b.escribir('#aula-capacidad', '28');
    await b.clic('app-drawer footer button', 'Crear aula');
    await b.esperar(1200);
    verificar('crea el aula y cierra el formulario', !(await b.evaluar(`!!document.querySelector('app-drawer .panel')`)));
    const tipo = await b.evaluar(`[...document.querySelectorAll('.aula')].find(a => a.querySelector('h3')?.textContent.trim() === 'Laboratorio de biología')?.querySelector('.titulo small')?.textContent.trim() ?? ''`);
    verificar('la nueva aula aparece como laboratorio', tipo === 'Laboratorio', tipo);

    // Materias: editar carga los valores (incluidos los radios de ícono y color)
    await b.ir('/colegio-san-jose/direccion/academico/materias');
    verificar('abre editar Física', await b.evaluar(`(() => { const x = document.querySelector('button[aria-label="Editar Física"]'); x?.click(); return !!x; })()`));
    await b.esperar(400);
    verificar('carga el nombre al editar', (await b.evaluar(`document.querySelector('#materia-nombre').value`)) === 'Física');
    verificar('carga las horas al editar', (await b.evaluar(`document.querySelector('#materia-horas').value`)) === '4');
    verificar('marca el radio del ícono guardado', (await b.evaluar(`document.querySelector('.icono-opcion input:checked')?.value`)) === 'atomo');
    verificar('marca el radio del color guardado', (await b.evaluar(`document.querySelector('.tono-opcion input:checked')?.value`)) === 'azul');

    // Gestión: cambiar la modalidad reparte las fechas en 4 bimestres
    await b.ir('/colegio-san-jose/direccion/academico/gestion');
    await b.clic('button.ui-btn', 'Nueva gestión');
    await b.esperar(400);
    await b.elegir('#ges-tipo', 'bimestre');
    await b.esperar(300);
    verificar('bimestral genera 4 periodos', (await b.evaluar(`document.querySelectorAll('.periodo-form').length`)) === 4);

    // Asignación: asignar un docente se refleja en el contador
    await b.ir('/colegio-san-jose/direccion/academico/asignaciones');
    await b.evaluar(`[...document.querySelectorAll('button.paralelo')].find(x => x.querySelector('.nombre').textContent.trim() === '1ro A').click()`);
    await b.esperar(400);
    const antes = await b.texto('app-page-header .ui-badge');
    await b.elegir('select[aria-label="Docente de Ciencias Naturales"]', '12');
    await b.esperar(1200);
    const despues = await b.texto('app-page-header .ui-badge');
    verificar('asignar docente actualiza el contador', antes !== despues, `${antes} -> ${despues}`);
  } finally {
    await b.cerrar();
  }
};
