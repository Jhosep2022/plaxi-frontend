// Marcación docente con QR rotativo + GPS: pantalla de la entrada, marcar, historial y vistas de la dirección
const { abrirNavegador } = require('./lib');

const LUNES_0720 = new Date(2026, 9, 19, 7, 20, 0);
const PUNTO = { lat: -16.5005, lng: -68.13 }; // "Entrada principal" (radio 100 m)

module.exports = async function marcacion({ verificar }) {
  const b = await abrirNavegador({ fecha: LUNES_0720, geolocalizacion: true });
  const cuerpo = () => b.evaluar('document.body.innerText');
  const escribirCodigo = async (codigo) => {
    await b.escribir('form.codigo input', codigo);
    await b.clic('form.codigo button', 'Registrar');
    await b.esperar(1000);
  };
  try {
    // ---------- Pantalla de marcación (dirección) ----------
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/pantalla-marcacion/1', 3000);
    verificar('la pantalla muestra el nombre del punto', (await b.texto('h1')) === 'Entrada principal');
    verificar('dibuja el QR', await b.evaluar(`!!document.querySelector('app-qr svg')`));
    const codigo = (await b.texto('.codigo')).replace(/\s/g, '');
    verificar('muestra un código de 6 dígitos', /^\d{6}$/.test(codigo), codigo);
    verificar('muestra la cuenta regresiva', /Cambia en \d+ s/.test(await b.texto('.cuenta small')));

    // ---------- Resumen del docente: semana real de marcaciones ----------
    await b.sesion('docente');
    await b.ir('/colegio-san-jose/docente/inicio');
    const semana = await b.evaluar(`[...document.querySelectorAll('app-profile-card .dias > div')].map(d => d.querySelector('.dia').textContent.trim() + ':' + [...d.querySelector('.dia').classList].find(c => c !== 'dia'))`);
    // El jueves María no tiene clases, por eso no figura como falta
    verificar('la semana del perfil sale de las marcaciones (atraso el miércoles)', semana.join(' ') === 'Ma:ok Mi:atraso Ju:pendiente Vi:ok Lu:hoy', semana.join(' '));

    // ---------- Docente: marcar entrada ----------
    await b.ir('/colegio-san-jose/docente/marcacion');
    verificar('muestra el horario esperado (entrada 07:15)', (await b.texto('.hoy .ui-ayuda')).includes('entrada 07:15'));
    verificar('entrada y salida pendientes', (await b.evaluar(`[...document.querySelectorAll('.marca strong')].map(s => s.textContent.trim()).join('|')`)) === 'Pendiente|Pendiente');

    // Lejos del colegio: no deja avanzar
    await b.ubicacion(-16.52, -68.15);
    await b.clic('.hoy button', 'Marcar entrada');
    await b.esperar(500);
    verificar('rechaza la ubicación fuera del radio', (await b.texto('.paso .error')).includes('Acércate a menos de 100 m'), await b.texto('.paso .error'));
    verificar('el paso del código queda bloqueado', await b.evaluar(`document.querySelectorAll('.paso')[1].classList.contains('bloqueado')`));

    // Cerca del punto
    await b.ubicacion(PUNTO.lat + 0.0003, PUNTO.lng);
    await b.clic('.paso button', 'Volver a intentar');
    await b.esperar(500);
    verificar('acepta la ubicación dentro del radio (33 m)', (await b.texto('.paso .ok')).includes('33 m de Entrada principal'), await b.texto('.paso .ok'));

    // Código equivocado y luego el correcto
    await escribirCodigo('123456');
    verificar('rechaza un código inválido', (await cuerpo()).includes('El código no es válido'));
    await escribirCodigo(codigo);
    verificar('registra la entrada', (await b.texto('.exito')).includes('Entrada registrada a las 07:2'), await b.texto('.exito'));
    verificar('la entrada queda "A tiempo" (dentro de la tolerancia)', (await b.texto('.marca .ui-badge')).startsWith('A tiempo'));
    verificar('ahora ofrece marcar la salida', (await b.texto('.hoy button.grande')).includes('Marcar salida'));

    // Historial
    await b.navegarEnApp('/colegio-san-jose/docente/marcacion/historial');
    const primeraFila = await b.texto('.ui-tabla tbody tr');
    verificar('el historial muestra la marcación de hoy primero', primeraFila.includes('Lun, 19 oct') && primeraFila.includes('A tiempo'), primeraFila);

    // ---------- Dirección: personal, horario laboral y puntos ----------
    await b.sesion('direccion');
    await b.ir('/colegio-san-jose/direccion/asistencia/personal');
    verificar('hoy deben marcar 3 docentes y ninguno lo hizo (datos recargados)', (await b.texto('.indicador strong')) === '0/3');
    await b.escribir('.fecha input', '2026-10-14');
    await b.evaluar(`document.querySelector('.fecha input').dispatchEvent(new Event('change', { bubbles: true }))`);
    await b.esperar(500);
    const maria = await b.evaluar(`[...document.querySelectorAll('.ui-tabla tbody tr')].find(tr => tr.textContent.includes('María'))?.textContent ?? ''`);
    verificar('el miércoles 14 María figura con atraso de 17 min', maria.includes('Con atraso · 17 min'), maria);

    await b.ir('/colegio-san-jose/direccion/institucion/horario-laboral');
    await b.escribir('#hl-tol', '90');
    await b.esperar(300);
    verificar('la tolerancia no puede pasar de 60 min', (await cuerpo()).includes('máxima es 60'));
    await b.escribir('#hl-tol', '5');
    await b.escribir('#sal-0', '07:00');
    await b.esperar(300);
    verificar('la salida debe ser posterior a la entrada', (await cuerpo()).includes('posterior a la entrada'));

    await b.ir('/colegio-san-jose/direccion/asistencia/puntos-marcacion');
    verificar('lista los 2 puntos de marcación', (await b.evaluar(`document.querySelectorAll('.punto').length`)) === 2);
    await b.clic('button.ui-btn', 'Nuevo punto');
    await b.esperar(300);
    await b.escribir('#pm-nombre', 'Puerta del coliseo');
    await b.ubicacion(-16.501, -68.1295);
    await b.clic('app-drawer button', 'Usar mi ubicación');
    await b.esperar(400);
    verificar('"Usar mi ubicación actual" carga las coordenadas', (await b.evaluar(`document.querySelector('#pm-lat').value`)) === '-16.501');
    await b.clic('app-drawer footer button', 'Crear punto');
    await b.esperar(1000);
    verificar('crea el nuevo punto', (await b.evaluar(`document.querySelectorAll('.punto').length`)) === 3);
  } finally {
    await b.cerrar();
  }
};
