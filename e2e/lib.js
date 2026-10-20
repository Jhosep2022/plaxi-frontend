// Utilidades para las pruebas e2e: controlan Chrome sin interfaz por el protocolo de DevTools.
// No necesitan dependencias extra (Node 22+ trae fetch y WebSocket).
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4200';
const CAPTURAS = path.join(__dirname, 'capturas');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function rutaChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidatos = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  const encontrado = candidatos.find((c) => fs.existsSync(c));
  if (!encontrado) throw new Error('No encontré Chrome. Define la variable CHROME_PATH.');
  return encontrado;
}

// Espacios y membresías de los datos mock
const ESCALA = { notaMaxima: 100, notaAprobacion: 51, criterios: [] };
const COLEGIO = { id: 1, slug: 'colegio-san-jose', nombre: 'Colegio San José', tipo: 'colegio', escala: ESCALA };
const ACADEMIA = { id: 2, slug: 'academia-maria', nombre: 'Academia de María', tipo: 'academia', escala: ESCALA };
const USUARIOS = {
  direccion: { id: 1, membresias: [{ espacio: COLEGIO, rol: 'direccion' }] },
  estudiante: { id: 2, membresias: [{ espacio: COLEGIO, rol: 'estudiante' }, { espacio: ACADEMIA, rol: 'estudiante' }] },
  docente: { id: 3, membresias: [{ espacio: COLEGIO, rol: 'docente' }, { espacio: ACADEMIA, rol: 'docente' }] },
  padre: { id: 6, membresias: [{ espacio: COLEGIO, rol: 'padre' }] },
};

// Script que se inyecta antes de cargar la página para fijar la fecha y hora "actual"
const scriptFecha = (fecha) => `(() => {
  const Real = Date; const fijo = new Real(${fecha.getTime()}).getTime(); const inicio = Real.now();
  class Simulado extends Real {
    constructor(...a) { if (a.length) super(...a); else super(fijo + (Real.now() - inicio)); }
    static now() { return fijo + (Real.now() - inicio); }
  }
  window.Date = Simulado;
})();`;

// Reemplaza navigator.geolocation: devuelve window.__ubicacion (o "permiso denegado" si no hay)
const SCRIPT_GEO = `(() => {
  const geo = {
    getCurrentPosition(ok, error) {
      setTimeout(() => {
        const u = window.__ubicacion;
        if (u) ok({ coords: { latitude: u.lat, longitude: u.lng, accuracy: 8 }, timestamp: Date.now() });
        else error({ code: 1, PERMISSION_DENIED: 1, message: 'denegado' });
      }, 50);
    },
    watchPosition() { return 0; },
    clearWatch() {},
  };
  Object.defineProperty(navigator, 'geolocation', { get: () => geo });
})();`;

async function abrirNavegador({ ancho = 1500, alto = 1100, fecha, geolocalizacion = false } = {}) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'quizwiz-e2e-'));
  const puerto = 9400 + Math.floor(Math.random() * 400);
  // E2E_VISIBLE=1 abre la ventana de Chrome para ver la prueba mientras corre
  const visible = !!process.env.E2E_VISIBLE;
  const proc = spawn(rutaChrome(), [
    ...(visible ? [] : ['--headless=new']), '--disable-gpu', '--no-first-run', `--remote-debugging-port=${puerto}`,
    `--user-data-dir=${perfil}`, `--window-size=${ancho},${alto}`, 'about:blank',
  ], { stdio: 'ignore' });

  let objetivo;
  for (let i = 0; i < 75 && !objetivo; i++) {
    await esperar(200);
    try { objetivo = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()).find((t) => t.type === 'page'); } catch { /* Chrome arrancando */ }
  }
  if (!objetivo) { proc.kill(); throw new Error('Chrome no respondió.'); }

  const ws = new WebSocket(objetivo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pendientes = new Map();
  const dialogos = [];
  const errores = [];
  const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; pendientes.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendientes.has(m.id)) { pendientes.get(m.id)(m); pendientes.delete(m.id); }
    // confirm()/alert(): se aceptan solos y se guarda el texto para verificarlo
    if (m.method === 'Page.javascriptDialogOpening') { dialogos.push(m.params.message); cdp('Page.handleJavaScriptDialog', { accept: true }); }
    if (m.method === 'Runtime.exceptionThrown') errores.push(m.params.exceptionDetails?.exception?.description ?? 'Error en la página');
  });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  if (fecha) await cdp('Page.addScriptToEvaluateOnNewDocument', { source: scriptFecha(fecha) });
  if (geolocalizacion) await cdp('Page.addScriptToEvaluateOnNewDocument', { source: SCRIPT_GEO });

  const evaluar = async (expr) => {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(`Error evaluando: ${expr.slice(0, 120)}\n${r.result.exceptionDetails.exception?.description ?? ''}`);
    return r.result?.result?.value;
  };

  const ctx = {
    dialogos,
    errores,
    evaluar,
    esperar,
    // Navega cargando la página completa (los datos mock vuelven a su estado inicial)
    ir: async (ruta, ms = 2500) => { await cdp('Page.navigate', { url: BASE + ruta }); await esperar(ms); },
    // Navega dentro de la app sin recargar (conserva los datos en memoria)
    navegarEnApp: async (ruta, ms = 1500) => {
      await evaluar(`history.pushState({}, '', ${JSON.stringify(ruta)}); dispatchEvent(new PopStateEvent('popstate'));`);
      await esperar(ms);
    },
    // Inicia sesión como un usuario mock escribiendo la sesión en localStorage
    sesion: async (usuario) => {
      const u = USUARIOS[usuario];
      await ctx.ir('/auth/login', 1200);
      await evaluar(`localStorage.clear(); localStorage.setItem('idUsuario', '${u.id}'); localStorage.setItem('userId', '${u.id}');
        localStorage.setItem('membresias', ${JSON.stringify(JSON.stringify(u.membresias))}); true`);
    },
    clic: (selector, texto) => evaluar(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.includes(${JSON.stringify(texto ?? '')}));
      if (!el) return false; el.click(); return true; })()`),
    // Escribe como lo haría el usuario (dispara input y blur)
    escribir: (selector, valor) => evaluar(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.focus();
      el.value = ${JSON.stringify(valor)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('blur')); return true; })()`),
    // Elige una opción de un <select> (dispara input y change, como el navegador)
    elegir: (selector, valor) => evaluar(`(() => { const s = document.querySelector(${JSON.stringify(selector)}); s.value = ${JSON.stringify(valor)};
      s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`),
    // Fija la ubicación que devolverá la geolocalización simulada (null = permiso denegado)
    ubicacion: (lat, lng) => evaluar(`window.__ubicacion = ${lat === null ? 'null' : JSON.stringify({ lat, lng })}; true`),
    texto: (selector) => evaluar(`document.querySelector(${JSON.stringify(selector)})?.textContent.trim() ?? ''`),
    captura: async (nombre) => {
      fs.mkdirSync(CAPTURAS, { recursive: true });
      fs.writeFileSync(path.join(CAPTURAS, nombre), Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
    },
    cerrar: async () => {
      ws.close();
      proc.kill();
      await esperar(300);
      try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { /* Chrome todavía soltando archivos */ }
    },
  };
  return ctx;
}

// Lleva la cuenta de verificaciones de una suite
function crearReporte(suite) {
  const resultados = [];
  return {
    suite,
    resultados,
    verificar(nombre, ok, detalle = '') {
      resultados.push({ nombre, ok: !!ok, detalle });
      console.log(`  ${ok ? '✔' : '✘'} ${nombre}${!ok && detalle ? `  →  ${detalle}` : ''}`);
    },
  };
}

module.exports = { BASE, abrirNavegador, crearReporte, esperar };
