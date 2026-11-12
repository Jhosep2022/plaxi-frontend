# Diseño de lo que falta: fases 9 a 12

> Documento para retomar el trabajo en otra sesión sin perder contexto.
> Escrito el 25 de octubre de 2026, al cerrar la fase 8. Complementa a `docs/plan-plataforma.md` (la fuente de verdad del producto).
> Cada fase se construye recién cuando el usuario aprueba su plan; las preguntas marcadas **[Decidir]** se le hacen antes de empezar.

> **Estado de ejecución (25 de octubre de 2026):** fase 9 implementada en backend y migrada en desarrollo hasta `0020`. Incluye institución, R2/MinIO, fotos, logos, portadas, PDF, entregas, siete grupos de tareas programadas, resumen semanal y avisos según preferencias. `bd:migrar-imagenes` se ejecutó en la base local: 0 fotos y 0 portadas antiguas por convertir. `bd:auditar-archivos` informó 0 archivos sin referencia. La limpieza de confirmados tiene dos períodos de siete días y segunda comprobación bajo bloqueo; las fotos de perfil están excluidas. Cancelar una subida libera la cuota, conserva la fila 24 horas y limpia objetos que lleguen después con la URL PUT aún vigente. PostgreSQL y MinIO locales quedaron detenidos después de la migración. Verificación final en copia temporal Linux: lint, build, 129 pruebas unitarias, 262 con PostgreSQL/MinIO y 4 e2e en verde. No se modificó la instalación de dependencias Windows del proyecto.

> **Avance de fase 10 (29 de octubre de 2026):** backend con migración `0021_admin_panel`, rutas de resumen, espacios, solicitudes, usuarios y registro; límites personalizados y auditoría. El frontend ya tiene la sección `/admin` con la paleta y clases `ui-*` existentes, todavía sobre mocks. La compilación Angular de desarrollo pasó en copia temporal. El contrato de administración usa nombres y valores en inglés; el panel adapta los estados históricos de la base de datos al presentarlos. Las cuentas de plataforma quedan fuera de las rutas y membresías de colegios y academias. Antes del cambio de nombres, backend build, lint, 129 unitarias, 271 pruebas contra PostgreSQL/MinIO y 4 e2e pasaron. Después del cambio, build y lint del backend, 129 pruebas unitarias y 271 pruebas con PostgreSQL/MinIO pasaron; Angular compiló y generó el bundle de desarrollo. Falta conectar las pantallas a la API en la fase 11 y ejecutar una revisión visual/e2e del panel. Se intentó usar Chrome de Windows desde este entorno Linux en el puerto 4300, pero no respondió al protocolo DevTools; el servidor temporal se cerró.

> **Corrección de convención (30 de octubre de 2026):** el usuario fijó inglés para el código. La regla anterior en este documento y en el README del backend quedó corregida. La migración de nombres todavía está pendiente: afecta módulos anteriores a la fase 9, además de archivos, identificadores, contratos y esquema de las fases 9 y 10. No avanzar a la fase 11 hasta terminarla y verificar las migraciones y pruebas.

> **Decisión posterior:** el usuario confirmó que también deben pasar a inglés las rutas públicas y las tablas/columnas de PostgreSQL. La conversión requiere compatibilidad temporal para rutas antiguas y migraciones de datos para el esquema. Los módulos internos `src/files`, `src/scheduled-tasks` y `src/institution` ya tienen nombres de clases y archivos en inglés, junto con `file-rules.ts`; el backend compila, pasa lint y 129 pruebas unitarias. El contrato externo y los demás módulos aún no están migrados.

> **Avance siguiente:** el frontend renombró guards, API de `SessionService` y tipos del modelo de espacios; `ngc` pasó con comprobación de plantillas. El backend añadió `/api/spaces/:slug/files` con DTO y respuestas en inglés, conservando `/api/espacios/:slug/archivos` durante la transición. Build, lint y 131 unitarias pasaron. La prueba de integración de archivos quedó pendiente porque Testcontainers no encontró Docker activo; las rutas antiguas alteradas accidentalmente en pruebas se restauraron. Aún faltan la mayoría de rutas, DTO, valores de dominio, esquema y migraciones.

### Corrección de idioma antes de la fase 11

1. Inventariar nombres de archivos, carpetas, símbolos y pruebas en ambos proyectos; separar textos visibles, valores de dominio, contratos HTTP y nombres persistidos. El inventario inicial cuenta 412 archivos bajo `src` en backend y 303 bajo `src/app` en frontend; 64 controladores, 49 tablas, 24 enums de PostgreSQL y 105 rutas del frontend. Es una convención previa de todo el proyecto, no solo de las fases 9 y 10.
2. Renombrar símbolos y archivos internos por dominio, actualizando importaciones, plantillas y pruebas. Mantener los textos visibles al usuario en español.
3. Resolver explícitamente las rutas y DTO públicos que siguen en español; si se decide cambiarlos, ofrecer transición compatible para clientes existentes.
4. Resolver el esquema PostgreSQL y los valores persistidos mediante migraciones de datos, sin editar migraciones que ya se aplicaron ni perder registros.
5. Verificar lint, build, pruebas unitarias, integración y e2e en backend y frontend. Marcar esta corrección como completa solo después de esas verificaciones.

## 0. Cómo retomar

### Estado al cerrar la fase 8

- **Backend** (`C:\programacion\plaxi-backend`): fases 1 a 8 terminadas.
  - 364 pruebas en verde: 120 unitarias, 4 e2e y 240 contra PostgreSQL real.
  - Lint, formato y build limpios.
  - Última migración: `0010_comunicados`.
  - **Sin commit**: el usuario hace los commits él mismo.
- **Frontend** (`C:\programacion\plaxi-frontend`): completo pero todavía con **datos mock**. 417 verificaciones e2e en verde sobre los mocks.

### Antes de empezar cualquier fase

1. Leer `docs/plan-plataforma.md`, este documento y la sección "Convenciones del código" del README del backend.
2. Levantar los servicios: `docker start plaxi-postgres plaxi-mailpit` (abrir Docker Desktop si está apagado).
3. Comprobar que todo está en verde: `npm run lint`, `npm test`, `npm run test:bd`, `npm run build`.

### Reglas que el usuario pidió (no negociables)

- **Plan antes de construir**: presentar el plan de la fase y esperar la aprobación.
- **Responder en español**. El código (identificadores, archivos, rutas nuevas, comentarios técnicos y contratos nuevos) se escribe en inglés. Los textos de interfaz y los mensajes destinados al usuario permanecen en español. Los nombres persistidos o públicos ya existentes requieren una migración compatible antes de cambiarlos.
- **Código limpio** (skill `clean-code`):
  - Nombres completos y funciones de hasta ~30 líneas.
  - Hasta 3 parámetros además de `tx` y `ctx`.
  - Sin flags ni números sueltos.
  - Cada regla pura con su `.spec.ts` y una idea por prueba.
  - El detalle está en el README del backend.
- **Nunca** cerrar el servidor del usuario en el puerto 4200; usar el 4300 y cerrarlo por su PID.
- **No hacer commit**, y no subir `.agents/`, `.claude/`, `.codestudio/` ni `skills-lock.json`.
- **Sin secretos en el repositorio.**
- Actualizar `docs/plan-plataforma.md` con cada decisión.

### Comandos del backend

| Comando | Para qué |
|---|---|
| `npm test` · `npm run test:bd` · `npm run test:e2e` | Unitarias · contra PostgreSQL (Testcontainers) · e2e |
| `npm run lint` · `npm run format` | oxlint y Prettier (el lint falla si falta formatear) |
| `npm run bd:generar -- --name <nombre>` · `npm run bd:migrar` · `npm run bd:semilla` | Migraciones y datos de ejemplo (la semilla **borra todo**) |
| `npm run admin -- crear/dar/quitar/listar` | Administradores de la plataforma |

## 1. Huecos encontrados en las fases ya hechas

Se resuelven dentro de la fase 9; están marcados en cada sección.

| Hueco | Dónde se resuelve |
|---|---|
| **Datos de la institución**: el frontend tiene la pantalla (`institucion.service.ts`) y el backend no tiene tabla ni rutas | 9.3 |
| **Avisos por eventos**: el perfil ofrece preferencias de tareas, calificaciones, asistencia y sesiones, pero el backend solo avisa de comunicados y solicitudes de la academia | 9.5 |
| **Imágenes como data URL en la base**: `aula.portada`, `usuario.imagen_url` y el futuro logo | 9.2 |
| **Archivos de las entregas**: solo se guardan sus datos (`entrega.archivos`), el archivo no se sube | 9.1 y 9.2 |
| **Tareas programadas**: no existe ninguna (`@nestjs/schedule` no está instalado) | 9.4 |
| **Servicios viejos del frontend** sin uso o casi: `course`, `leccion`, `tema`, `categoria`, `gmail` | 11 |
| Usuario `admin` de la semilla: es la **directora** del colegio, no el administrador de la plataforma (ese es `plataforma`) | 11 (renombrarlo puede confundir menos) |

## 2. Fase 9: archivos, institución, tareas programadas y avisos

### 9.1 Módulo `archivos` (Cloudflare R2)

**Objetivo**: los archivos van directo del navegador a R2 con enlaces firmados; el backend nunca los recibe.

**Desarrollo local**: MinIO en `docker-compose.yml` (compatible con S3). Las pruebas lo levantan con Testcontainers. Variables nuevas: `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`. Agregarlas a `config/entorno.ts` y a `.env.example`.

**Tabla `archivo`** (del espacio, con RLS):

| Columna | Detalle |
|---|---|
| `id`, `espacio_id` | |
| `clave` | ruta en R2: `<espacio>/<uso>/<uuid>` |
| `uso` | `portada` · `foto` · `logo` · `tema` · `entrega` |
| `nombre`, `tipo_mime`, `bytes` | |
| `subido_por` | usuario |
| `estado` | `pendiente` hasta confirmar · `listo` · `cancelado` |
| `creado` | |

- **Cuota por espacio**: contar archivos `listo` y reservas `pendiente` bajo bloqueo por espacio; liberar la reserva al confirmar, cancelar o vencer. Dos subidas simultáneas no deben exceder el límite.
  - Academia en prueba: 1 GB. Colegio en prueba: 5 GB (§4.1).
  - Los límites van en `comun/limites.ts`. Pasan a la tabla de límites del espacio en la fase 10.
- La foto de perfil es del usuario, no de un espacio: usar una tabla global `archivo_usuario` y rutas bajo `/api/perfil/archivos`. Aplicar un límite por usuario, sin cargarla a la cuota de un colegio o academia.

**Flujo de subida**

1. `POST /api/espacios/:slug/archivos/subida` con `{ uso, nombre, tipoMime, bytes }`.
2. El backend valida el tipo y el tamaño (§4.2), la cuota y el permiso según el uso.
3. Reserva la cuota, crea la fila `pendiente` y devuelve `{ id, urlSubida }`: un enlace firmado por 10 minutos. La URL PUT firma el tipo; el tamaño declarado se verifica al confirmar con `HEAD` (una URL PUT firmada no impone por sí sola un tamaño máximo).
4. El navegador sube el archivo a R2.
5. `POST …/archivos/:id/confirmar`: el backend hace `HEAD`, verifica tamaño real, tipo y dueño, y marca el archivo `listo`. Si falla, elimina el objeto y libera la reserva.
6. Para portadas y PDF, `PUT …/archivos/:id/vincular` lo asocia con el aula o tema indicado al solicitar la subida. El logo se vincula mediante `PUT /institucion/logo`; la entrega, al presentarla.
7. `DELETE …/archivos/:id` cambia una reserva propia aún `pendiente` a `cancelado` y libera la cuota de inmediato. Conserva la clave 24 horas para borrar también un objeto que llegue después de cancelar con la URL PUT aún vigente.

**Descarga y borrado**

- **Descarga**: `GET …/archivos/:id` devuelve una URL GET firmada de vida corta (5 minutos), después de verificar quién puede verlo:
  - Portada y logo: cualquier miembro.
  - Archivo de un tema: quien puede abrir el aula.
  - Entrega: el estudiante, sus padres y el docente del aula.
- **Borrado**: los `pendiente` de más de 1 día se limpian en la base y en R2. Para archivos confirmados de espacios, después de siete días sin referencia se marca `retirado_el`; pasados otros siete días, se vuelve a comprobar la ausencia de referencias bajo bloqueo de fila y se borran el objeto y la fila. Un archivo retirado no se puede volver a vincular. Las fotos de perfil confirmadas quedan fuera de esta limpieza. La autorización de descarga consulta la relación con la entrega, el tema, el logo o la portada concreta, no solo el campo `uso`.

**Límites** (§4.2, en `LIMITES_ARCHIVOS`)

| Uso | Límite |
|---|---|
| Imágenes | 800 KB, solo imágenes |
| PDF de un tema | 20 MB |
| Entrega de tarea | 10 MB por archivo, hasta 3 archivos |

**Pruebas**

- Reglas puras con spec: qué uso acepta qué tipo y tamaño, y la cuota.
- Contra la base y MinIO:
  - Subir, confirmar y descargar.
  - Rechazos por tamaño, tipo, cuota y permiso.
  - Un espacio no ve los archivos de otro.

### 9.2 Pasar las imágenes y las entregas a archivos

- `aula.portada`, `usuario.imagen_url` (y el logo de la 9.3) guardan el **id del archivo** en lugar del data URL.
- **Migración de datos**: un script recorre los data URL que ya existen, los sube a R2 y reemplaza el valor. Se corre antes de quitar la validación vieja (`comun/imagenes.ts`).
- `entrega.archivos` guarda ids de archivo (`{ archivoId, nombre, bytes }`). Al entregar se exige que estén `listo` y que sean del mismo estudiante.
- **Temas de tipo `pdf`**: el contenido apunta a un archivo del aula.
- Para mostrar una imagen con `<img>`, el frontend pide `GET /archivos/:id/enlace` con Bearer y usa la URL firmada temporal. Para descargas hechas con `fetch`, `GET /archivos/:id` redirige tras autorizar. La etiqueta `<img>` no puede adjuntar el Bearer a una redirección protegida.

### 9.3 Datos de la institución (hueco)

- **Tabla `institucion`**: 1 a 1 con el espacio colegio. Campos del modelo del frontend (`core/models/institucion.model.ts`):
  - `nombre`, `sigla`, `lema`, `codigo_sie` (8 dígitos), `dependencia` (fiscal · particular · convenio), `niveles`.
  - `fundacion`, `departamento`, `municipio`, `zona`, `direccion`.
  - `telefono`, `email`, `sitio_web`, `director`, `subdirector`.
  - `logo` (archivo).
- **Rutas**: `GET /api/espacios/:slug/institucion` (cualquier miembro) y `PUT` (dirección), con su DTO y las listas de departamentos y dependencias en un archivo de catálogo.
- **Al cambiar el nombre**, se actualiza también `espacio.nombre` (el selector de espacios lo usa).
- **Uso**: el boletín y el centralizador incluyen nombre, código SIE e id del logo. El frontend obtiene la URL firmada del logo con `/archivos/:id/enlace` al mostrar o exportar el reporte.
- La semilla carga los datos del Colegio San José (copiar del mock del frontend).

### 9.4 Tareas programadas (`@nestjs/schedule`)

**Reglas comunes**

- Cada tarea tiene dos partes:
  - Una **regla pura** que decide qué tocar, con su spec.
  - Un servicio que ejecuta, de forma idempotente (correrla dos veces no hace daño).
- **Una sola instancia a la vez**: lock de PostgreSQL (`pg_try_advisory_lock`) por tarea, para cuando haya varias copias del backend.
- **Hora de Bolivia** (`RelojService`). Las pruebas usan el reloj fijo y llaman al servicio directamente, sin esperar al cron.
- Los plazos van en `comun/limites.ts`.
- Los envíos programados guardan una clave única por destinatario, evento y periodo. Así, reiniciar el proceso o repetir una ejecución no duplica avisos ni correos.

| Tarea | Cuándo | Qué hace |
|---|---|---|
| Vencer pruebas | todos los días, 00:05 | `estado = 'prueba'` y `prueba_hasta < hoy` → `solo_lectura`, con aviso y correo a la dirección o al docente dueño |
| Avisar fin de prueba | todos los días, 08:00 | aviso y correo **7 días y 1 día** antes. **[Decidir los días: el plan solo dice "avisar antes"]** |
| Borrar pruebas no convertidas | todos los días | archivos de espacios en `solo_lectura` por prueba vencida: avisos a los 30 y 7 días antes; se borran **60 días después de vencer** (§4.1) |
| Purgar bajas de cursos | todos los días | inscripciones `baja` con `baja_el` de hace más de `DIAS_RETENCION_BAJA` (90): borrar el progreso, los intentos, las entregas y sus objetos físicos, y la inscripción |
| Limpiar | todos los días, 03:00 y 03:10 | sesiones vencidas o revocadas de hace más de 30 días, tokens de recuperación usados o vencidos, archivos `pendiente` de más de 1 día, retiro y borrado de confirmados sin referencia con dos períodos de siete días, y avisos leídos de más de 90 días |
| Recordatorio de sesión en vivo | cada minuto | sesiones que empiezan en 10 minutos → aviso a sus estudiantes (preferencia `sesiones`) |
| Resumen semanal | lunes 07:00 | correo a quien tiene la preferencia `resumen` activa. **[Decidir el contenido por rol; propuesta abajo]** |

**Propuesta de resumen semanal**

| Rol | Contenido |
|---|---|
| Estudiante | tareas que vencen esta semana, notas nuevas y asistencia de la semana pasada |
| Padre | lo mismo de cada hijo |
| Docente | entregas por revisar y actividades sin calificar |
| Dirección | asistencia general y puntualidad docente de la semana pasada (usar los reportes de la fase 8) |

Si una cuenta tiene varios roles o espacios, recibe un solo correo con secciones por espacio y rol, sin repetir la misma actividad.

### 9.5 Avisos por eventos (hueco)

- **Generalizar el patrón de los comunicados**: un `AvisosService` en `notificaciones` que reciba la audiencia (destinatarios + cuentas), arme los avisos y los correos respetando las preferencias (`app` / `correo`) y mande los correos después de confirmar la transacción.
  - Comunicados y academia pasan a usarlo.
  - La regla pura de preferencias tiene su spec.

| Evento | A quién | Preferencia |
|---|---|---|
| Tarea nueva publicada | estudiantes del aula (y sus padres en el colegio) | `tareas` |
| Entrega revisada (con nota o comentario) | el estudiante (y sus padres) | `tareas` |
| Nota nueva en la planilla | el estudiante y sus padres | `calificaciones` |
| Falta o atraso registrado | los padres (el estudiante, solo el aviso) | `asistencia` |
| Licencia aprobada o rechazada | el padre que la pidió | `asistencia` |

- **[Decidir]** ¿Se agrupan los avisos de notas? Una planilla guardada puede tocar 30 notas: se recomienda **un aviso por actividad**, no uno por nota.
- **[Decidir]** ¿Al padre le llega correo por cada falta, o solo el aviso? Se recomienda el correo **solo en las faltas** y no en los atrasos.

**Pruebas**: contra la base, cada evento genera sus avisos y respeta una preferencia apagada.

### 9.6 Cierre de la fase 9

- README (sección de archivos, tareas y avisos) y §5.14 en el plan maestro.
- Agregar las tablas nuevas a la prueba de aislamiento.

## 3. Fase 10: panel de administración

> Al iniciar la fase solo existía `GET /api/admin/espacios`; el contrato nuevo de la fase 10 usa rutas y DTO en inglés.
> Regla decidida: **el administrador solo ve datos de gestión**; nunca notas, asistencia ni datos de los estudiantes.

### 10.1 Backend (`/api/admin`, todo con `@SoloAdmin()`)

| Ruta | Qué hace |
|---|---|
| `GET /admin/summary` | espacios por tipo y estado, pruebas que vencen en 7 días, solicitudes nuevas, usuarios activos (sesión en los últimos 30 días) y almacenamiento total |
| `GET /admin/spaces?type=&status=&search=` · `GET /admin/spaces/:id` | lista filtrable y detalle: miembros por rol, uso de almacenamiento, fechas y límites |
| `PUT /admin/spaces/:id/status` | activar, suspender o pasar a solo lectura, con motivo |
| `PUT /admin/spaces/:id/trial` | extender la prueba (nueva fecha) |
| `PUT /admin/spaces/:id/limits` | cursos, estudiantes y GB del espacio |
| `GET /admin/requests` · `PUT /admin/requests/:id` | solicitudes de colegio: marcar contactada o descartada, con notas |
| `POST /admin/requests/:id/school` | **dar de alta un colegio**: crea el espacio colegio, la cuenta de la dirección (pendiente, con correo de invitación), la escala inicial y la gestión del año |
| `GET /admin/users?search=` · `GET /admin/users/:id` | buscar por nombre, usuario o correo; ver sus espacios y roles (sin datos internos) |
| `PUT /admin/users/:id/active` · `POST /admin/users/:id/invitation` | desactivar o reactivar una cuenta; reenviar la invitación |

**Tablas**

- **`space_limit`**: los límites propios de cada espacio, que reemplazan a los fijos de `LIMITES_PRUEBA` cuando existen.
- **`admin_audit_log`** (auditoría): quién, qué acción, sobre qué y cuándo, con un detalle en JSON. Cada acción del panel deja su registro. `GET /admin/audit` para verlo.
- **Decidido**: solo límites por espacio por ahora; los planes con nombre y sus precios se definirán tras el estudio comercial (§8 del plan).

### 10.2 Frontend (sección `/admin`, nueva)

- Guard: solo `esAdmin` (el login ya devuelve `usuario.esAdmin`).
- Pantallas:
  - Resumen.
  - Colegios y academias: lista con filtros, detalle y acciones de estado, prueba y límites.
  - Solicitudes, con "Dar de alta".
  - Usuarios.
  - Registro de acciones.
- Mismo diseño que el resto (paleta `#0a0a23`, `#bccf4e`, `#f6e7d8`, `#fff` en variables).
- **Presentar el diseño de las pantallas antes de construirlas** (memoria del usuario: plan antes de rediseñar).

### 10.3 Pruebas

- Cada ruta rechaza a quien no es administrador.
- El alta de colegio crea todo lo necesario.
- Cambiar el estado bloquea la escritura en el espacio.
- Ninguna respuesta del panel incluye datos internos (como en `admin.bd-spec.ts`).

## 4. Fase 11: conectar el frontend

### 11.1 Base

- **Configuración**: `environment` con `apiUrl` (desarrollo: `http://localhost:8080/api`, como el backend y el frontend actuales).
- **`HttpClient` con un interceptor que**:
  - Agrega `Authorization: Bearer <accessToken>`.
  - Envía `withCredentials` para la cookie de refresh.
  - Ante un 401 llama una vez a `POST /api/auth/refresh` y reintenta. Si falla, cierra la sesión y lleva al login.
- **Errores**: la API siempre responde `{ codigo, mensaje, campos? }`. Un helper muestra `mensaje` en un snackbar y pone `campos` en los controles del formulario.
- **Sesión**: `SessionService` usa el login real. El token se guarda **en memoria** (no en localStorage) y al recargar se recupera con el refresh.
- **Archivos**: componente de subida con el flujo de la 9.1 (pedir enlace, subir directo, confirmar).

### 11.2 Reemplazar los servicios mock, módulo por módulo

**Orden**

1. auth, perfil y espacios
2. académico y personas
3. horarios, asistencia y marcación
4. calificaciones
5. aulas, quiz y tareas
6. academia
7. comunicados, reportes, indicadores e institución
8. admin

**Al terminar cada módulo**

- Probar las pantallas con la API y la semilla (`npm run bd:semilla`).
- Borrar sus mocks.
- Actualizar los e2e.

**Diferencias de contrato que hay que resolver** (ajustar el modelo del frontend; el backend no se cambia por gusto)

| Tema | Detalle |
|---|---|
| Ids del estudiante | en aulas, quiz y tareas el backend usa `usuarioId`; en la planilla, la asistencia y las licencias, la ficha (`personaId`) |
| Fechas | el backend devuelve `Date` en ISO con zona; el mock usa texto local (`'2026-10-19T08:10:00'`) |
| Vacíos | `null` en vez de `''`: por ejemplo `fechaEvento` del comunicado, `logo` y la grabación |
| Lectura de comunicados | `{ leidoEl, confirmadoEl }` en vez de `{ leidoEl, confirmado }`; alcance en `lecturas`; la vista previa usa `GET /comunicados/alcance` |
| Reportes | el backend devuelve los números calculados: simplificar `asistencia-reporte`, `puntualidad` y `rendimiento` para que solo muestren (el umbral de alerta, META, queda en el frontend) |
| Indicadores del perfil | el backend devuelve números por rol (`/indicadores?rol=`); los textos los arma `perfil.service.ts` |
| Resumen (Inicio) | `resumen-colegio.service.ts` y `resumen-academia.service.ts` combinan varios endpoints existentes; evaluar si conviene un endpoint `/inicio` por rol después de conectarlos |

**Limpieza**

- Borrar los servicios sin uso o viejos (`course`, `leccion`, `tema`, `categoria`, `gmail`, `resumen`) después de confirmar qué pantalla los usa (`curso-form`, `registro` y `sidebar` usan `course` o `categoria`).
- Borrar `src/app/mocks/` al final.

### 11.3 Pruebas

- Los e2e del frontend (417 verificaciones) pasan a correr contra la API real con la semilla. El backend se levanta en el puerto 8080; el frontend en el **4300** (nunca tocar el 4200).
- Las verificaciones que dependían de datos al azar del mock (por ejemplo las lecturas simuladas de comunicados) se ajustan a los datos fijos de la semilla.

## 5. Fase 12: despliegue a producción

### Requisitos previos (bloquean la fase) **[Decidir]**

- **Nombre de la app y dominio** (QuizWiz es provisional). Recomendación: `app.<dominio>` para el frontend y `api.<dominio>` para el backend.
- **Cuentas a crear**: DigitalOcean, Cloudflare (DNS, Pages y R2), proveedor SMTP (Amazon SES o Brevo), GitHub (para Actions y GHCR) y Sentry.
- **Textos legales**: términos de uso y política de privacidad (los revisa un profesional).

### Infraestructura (etapa 0, §5.2: ~US$44 a 50 al mes)

| Pieza | Servicio |
|---|---|
| Frontend | Cloudflare Pages: build de Angular en cada push a `main` |
| Backend | Droplet de 2 vCPU y 4 GB (DigitalOcean, EE. UU. Este) con docker compose: la API y un proxy con TLS (Caddy) detrás de Cloudflare |
| Base de datos | PostgreSQL administrado de DigitalOcean (1 GB) con los roles `plaxi` (migraciones) y `plaxi_app` (API, con RLS) y contraseñas propias |
| Archivos | bucket de R2 con CORS para el dominio del frontend |
| Correos | SMTP de producción, con SPF, DKIM y DMARC en el DNS (si no, caen en spam) |

### CI/CD (GitHub Actions, todavía no existe)

1. En cada PR: lint, pruebas unitarias, pruebas contra la base (Testcontainers corre en Actions) y build.
2. En `main`:
   - Construir la imagen Docker (ya hay `Dockerfile`) y publicarla en GHCR.
   - Entrar al droplet por SSH, descargar la imagen nueva y ejecutar `node dist/comun/bd/migrar.js` de esa imagen con `DATABASE_URL_MIGRACIONES`.
   - Levantar la nueva versión con `docker compose up -d` solo después de una migración correcta. Las migraciones deben ser compatibles con la versión anterior durante el cambio.

### Configuración de producción

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRETO` | 32 caracteres o más |
| `FRONTEND_URL` | el dominio real |
| `COOKIE_DOMINIO` | `.<dominio>` |
| `COOKIE_SEGURA` | `true` |
| `CONFIAR_PROXY` | `true` |
| Correo y archivos | `SMTP_*`, `R2_*` |

- OpenAPI (`/api/docs`) apagado.
- Los secretos van en el droplet (archivo `.env` con permisos 600) o en los secretos de GitHub, nunca en el repositorio.

### Respaldos y monitoreo

- **Respaldos**: los automáticos de la base administrada, más un `pg_dump` diario cifrado a R2 (tarea programada o cron del droplet), con una **prueba de restauración** documentada.
- **Monitoreo**:
  - UptimeRobot para `/api/salud` y el frontend.
  - Sentry en el backend y en el frontend.
  - Logs en JSON con rotación.

### Puesta en marcha

1. Entorno de pruebas (*staging*), igual que producción y con datos de la semilla.
2. Producción vacía (sin semilla).
3. `npm run admin -- crear` para el equipo.
4. Alta del primer colegio piloto desde el panel (fase 10).

### Lista de seguridad antes de abrir

- RLS verificado en staging con la prueba completa de aislamiento; en producción, comprobar las políticas y los permisos con consultas de solo lectura que no creen ni modifiquen datos.
- Límite de intentos activo.
- helmet y CORS solo para el dominio real.
- Contraseñas de los roles de PostgreSQL rotadas.
- Usuarios de la demo **inexistentes** en producción.

## 6. Después de las fases (hoja de ruta del plan maestro)

- Revisión en celular: e2e a 390 px.
- Estudio comercial: costos reales, precios de planes y márgenes (en USD de referencia, por el tipo de cambio).
- Proyecto de marketing (§10 del plan maestro).
- Más adelante: quiz en vivo (WebSockets), video protegido para los planes de academia, modo oscuro.

## 7. Preguntas pendientes para el usuario (juntas)

| Fase | Pregunta | Recomendación |
|---|---|---|
| 9 | ¿Cómo mostrar imágenes protegidas? | Pedir una URL firmada mediante `/archivos/:id/enlace`; redirigir las descargas autenticadas |
| 9 | ¿Cuándo avisar el fin de la prueba? | 7 días y 1 día antes |
| 9 | ¿Qué lleva el resumen semanal de cada rol? | La propuesta de la 9.4 |
| 9 | ¿Avisos de notas uno por nota o uno por actividad? | Uno por actividad |
| 9 | ¿Correo al padre por cada falta? | Solo por faltas, no por atrasos |
| 10 | ¿Planes con nombre o solo límites por espacio? | Solo límites por ahora |
| 10 | Diseño de las pantallas de `/admin` | Mostrarlo antes de construir |
| 12 | Nombre de la app, dominio y cuentas de los servicios | — (lo decide el usuario) |
| 12 | Textos legales | Revisados por un profesional |
