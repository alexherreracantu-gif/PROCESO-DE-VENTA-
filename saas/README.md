# Park Point · portal interno de ventas

App para el equipo de **BYD Cumbres · Park Point**: cada quien entra con su usuario y contraseña, registra sus ventas (VIN, número de cliente, modelo, color y productos), sigue sus metas y su corte de piso, y dirección ve todo el equipo con un tablero que se descarga como imagen para WhatsApp.

Hecho con **Next.js 16 + Supabase (Postgres, Auth, permisos por fila) + Vercel**.

Identidad **BYD Grupo TEC** en colores claros: fondo blanco, barra lateral blanca y azul de marca `#159BE6` en acentos. Logo en `public/marca/` (azul para fondos claros, blanco para el reporte descargable) e íconos de la app en `public/iconos/`. Si cambia el logo, reemplaza esos archivos.

**Partes escondidas por ahora:** el Agente IA (menú), la tarjeta *Seguimientos para hoy* del Inicio y el CEO en el inicio de sesión (entran Jorge, Mariana, Leonardo y Omar; Jorge administra). Siguen en el código y funcionando; para mostrarlas, cambia a `true` lo que corresponda en `VISIBLE` (`src/lib/config.ts`).

## Qué hace

| Módulo | Para qué |
|---|---|
| **Inicio** | Te dice quién eres, tu avance del mes (unidades, faltan, ritmo por semana, productos por unidad), ranking del equipo, seguimientos de hoy y ventas en proceso. |
| **Ventas** | Alta de cada venta (se guarda completa o no se guarda): fecha, vendedor, cliente, número de cliente, VIN (valida 17 caracteres y que no se repita), modelo, color y nombre comercial, forma de pago, plaza, estatus, fecha de entrega y productos. Al registrarla se abre su **expediente**, de la aprobación del crédito a la hoja de salida (ver abajo), con su **cuenta del cliente** y un **historial de cambios**. Vista **Expedientes abiertos** con avance y saldo de cada venta en proceso. |
| **Expediente del cliente** | 6 etapas: crédito y documentos del cliente → separación y pedido → facturación → pagos y cuadre → placas y permisos (permiso de frontera en Piedras Negras) → hoja de salida y entrega. Cada documento se **sube** (PDF, foto, Excel; las fotos se reducen solas), se **enlaza** desde Google Drive, se marca **en físico** o **no aplica**. La **cuenta del cliente** lleva cada cargo (factura, accesorios, garantías, placas, gestoría, permiso…) y cada pago (separación, pago del cliente, desembolso, bono/nota de crédito) con fecha, forma de pago, número de recibo y su archivo; cuadra por concepto como la aplicación de pago. Al subir la factura la venta pasa a Facturada. El asesor no puede marcar **Unidad entregada** hasta tener todo al 100% sin adeudo (dirección puede autorizarla). **Hoja de control** imprimible para el día de la entrega, con firmas. |
| **Seguimiento** | Botón **Pedir lo que falta** que abre WhatsApp con la lista de documentos y firmas pendientes del cliente (y su saldo cuando ya no depende del banco). **Descargar ZIP** del expediente acomodado por etapa, con la cuenta en CSV. En el Inicio, **Que no se te pase**: entregas en riesgo, expedientes sin movimiento, pagos sin recibo, adeudos y postventa que ya toca. |
| **Entregas** | Calendario de los próximos 14 días y lista por día con lo que le falta a cada expediente; atrasadas y expedientes sin fecha. La fecha se programa desde el expediente. |
| **Postventa** | Al entregar: reseña, video, llamada de satisfacción, referidos y recordatorio del primer servicio, cada uno con su fecha y su mensaje de WhatsApp listo. |
| **Mis comisiones** | Comisión por venta (monto por unidad, % de factura y por producto: fijo o % de su precio), ganado vs. por cobrar, bono por meta y meta personal de ingreso con cuántas ventas faltan. Dirección captura el esquema en la misma pantalla. |
| **Resultados de anuncios** | Por canal (Meta Ads, Instagram, landing, referido…): prospectos, ventas, conversión, inversión, costo por prospecto, **costo por venta** y ganancia contra comisiones. Cada asesor captura lo que invirtió por mes; dirección ve al equipo. Cada venta guarda de dónde llegó el cliente (si sale del CRM, toma el origen del prospecto). |
| **Cotización en PDF** | Desde el cotizador: hoja con foto del auto, números Banorte, plazos de 36 a 72 meses y datos del asesor, lista para imprimir o guardar como PDF y mandar por WhatsApp. |
| **Respaldo** | Botón en Ventas: ZIP con ventas, cuenta de cada cliente, lista de documentos, prospectos e inversión (CSV que abre Excel). A dirección se le recuerda cada semana en el Inicio. |
| **Seguridad** | Aviso hasta que cada quien cambie la contraseña compartida. La landing trae campo trampa y tiempo mínimo contra robots, y el webhook frena avalanchas (más de 30 prospectos en 10 minutos). |
| **Dashboard general** (`/panel`) | El tablero de todo el equipo **sin iniciar sesión**, de solo lectura: indicadores, ranking, productos, modelos, colores y detalle de ventas. Se actualiza solo cada 5 minutos (para dejarlo en una pantalla). Es público: cualquiera con el enlace ve las cifras y el detalle. |
| **Tablero de reporte** | Por mes y por vendedor: unidades contra meta y contra el mes anterior, penetración por producto, ranking, modelos, colores y detalle. **Descargar imagen** (PNG), **Compartir** desde el celular y **Exportar Excel** (CSV). |
| **Objetivos** | Meta de unidades por vendedor y meta de penetración por producto, por mes. Dirección las edita; el equipo ve su avance. |
| **Corte de piso** | Contadores del día (clientes nuevos, citas, demos, solicitudes…) que se guardan solos; texto listo para WhatsApp. Dirección ve el corte de todos. |
| **Prospectos (CRM)** | Tablero de Nuevo a Referidor con siguiente acción y fecha; avisa los vencidos; **Convertir en venta** con un clic. Recibe prospectos automáticos de la landing y de Meta, repartidos por turno. |
| **Reporte semanal** | Cada lunes, por correo (y WhatsApp opcional): nuevos → contactados → citas → propuestas → cierres de la semana pasada contra la anterior, flotillas aparte, unidades del mes contra los escalones de 7 y 13, prospectos sin contactar y un foco para la semana. Dirección recibe el de la agencia con cada asesor. |
| **Fotos de modelos** | 4 fotos por modelo (3 exterior, 1 interior). Dirección las sube desde el celular o la compu (se comprimen solas); cualquier asesor toca **Enviar al cliente** y en el celular se abre compartir con las 4 fotos (WhatsApp); en la compu se descargan. También desde el cotizador. |
| **Generador de anuncios** | Anuncios con el estilo de BYD Grupo TEC (estilos Bono, Mensualidad y Centrado; formatos 1:1, 4:5 y 9:16) con la oferta del mes del catálogo, mensualidad y tasa del cotizador Banorte, foto del modelo, nombre y WhatsApp del asesor y letra chica automática (precio con IVA, condiciones del bono y de la mensualidad, vigencia). Descargar, compartir y textos listos para Facebook, Instagram, Meta Ads y WhatsApp. |
| **Anuncios oficiales** | Galería con las piezas de la campaña del mes (las que manda mercadotecnia): se abren en grande, se descargan o se comparten por WhatsApp de un clic. Dirección sube las nuevas cada mes. El generador usa las cifras oficiales de la campaña (mensualidad desde, tasa desde, enganche desde y autonomía) que se capturan por modelo en Catálogo y precios, con el estilo "Campaña" igual a las piezas oficiales. |
| **Landing de flotillas** (`/flotillas`) | Página pública para empresas, fraccionamientos, municipios y desarrolladoras: calculadora de ahorro contra gasolina, modelos por uso y formulario que entra al CRM como "Landing flotillas". Con `?a=<usuario>` le llega a ese asesor. Opcional: WhatsApp automático con imagen al cliente y aviso al asesor (ver "Landing de flotillas y WhatsApp automático"). |
| **Cotizador para clientes** (`/cotiza`) | Página pública, sin contraseña, para compartir en redes, estados y anuncios: el cliente elige su BYD, mueve enganche y plazo, ve su mensualidad Banorte con el bono del mes y deja su nombre y WhatsApp. Llega como prospecto "Cotizador web" al CRM. Con `?a=<usuario>` (botón "Copiar mi link" en el Cotizador) la cotización le llega a ese asesor; sin él, se reparte por turno. Toma precios, bonos y campaña del catálogo, así que se actualiza solo cada mes. |
| **Cotizador** | Herramienta interna en 3 pasos (vehículo y cliente → enganche y extras → resumen y Banorte), con fórmulas Banorte Plan Tradicional validadas al centavo: responsable, enganche total con bono o presupuesto a la firma, convenio automático o elegido, plazos de 12 a 72 meses, Wallbox, accesorios, Cerocible, seguro de llantas y garantía financiados, seguros del primer año. **Cotizar y verificar en Banorte** abre el simulador oficial y la extensión de Chrome *Conector Banorte* (carpeta `conector-banorte/`, se descarga desde el mismo Cotizador) lo llena, calcula y regresa mensualidad, comisión, plazos y seguros oficiales; la cotización queda "Verificada con Banorte" (con captura manual de respaldo). Después de cambiar la extensión: `npm run conector` para regenerar `public/conector-banorte.zip`. Resume "de la bolsa del cliente a la firma", manda WhatsApp, genera PDF y guarda la cotización en el CRM. |
| **Guiones**, **Academia BYD**, **Agente IA** | Guiones para copiar, 7 módulos con quiz y examen final (avance por persona) y un asistente con Claude que conoce el catálogo del mes y tus seguimientos. |
| **Equipo** *(dirección)* | Altas con contraseña temporal, roles, quién vende, bajas, nueva contraseña; avance de cada quien. |
| **Catálogo y precios** *(dirección)* | Precios y bonos del mes, productos que se miden y montos de trámites. |

### Roles y permisos

| | CEO | Gerente (Jorge) | Asesor |
|---|---|---|---|
| Ver ventas, prospectos y cortes | Todo el equipo | Todo el equipo | Solo los suyos |
| Registrar ventas | Para cualquier vendedor | Para cualquier vendedor (también las suyas) | Solo a su nombre |
| Borrar ventas | Sí | Sí | No (las marca como Cancelada) |
| Metas, catálogo, equipo | Sí | Sí (no puede modificar al CEO ni dar roles de dirección) | Solo lectura de metas |
| Ranking del equipo | Sí | Sí | Sí (solo números, sin clientes) |

Los permisos se aplican **en la base de datos** (Row Level Security), no solo en la pantalla: aunque alguien intente leer la base directamente, solo recibe lo que su rol permite. Cada dato pertenece a una agencia, así que la misma app puede dar servicio a más agencias sin mezclar información.

## Despliegue (una sola vez, ~10 minutos, sin terminal)

1. **Vercel → importa el repositorio.** En [vercel.com](https://vercel.com) → *Add New → Project* → elige este repositorio. En **Root Directory** pon `saas` y en **Branch** la rama donde está el portal (o `main` cuando se fusione). En *Environment Variables* agrega dos:
   - `CODIGO_INSTALACION`: una palabra que solo tú sepas. Se pide una única vez, al configurar el portal.
   - `LEADS_TOKEN`: otra clave larga, para recibir prospectos de la landing y de Meta (ver abajo).

   Toca *Deploy*. El primer despliegue muestra "Falta conectar la base de datos": es normal.

2. **Conecta Supabase desde Vercel.** En el proyecto: *Storage → Create Database → Supabase* (o *Connect* si ya tienes uno). Vercel crea el proyecto de Supabase y le pasa las llaves solo. Después: *Deployments → ⋯ → Redeploy*. En cada despliegue se crean o actualizan las tablas, los permisos y el catálogo automáticamente.

3. **Configura el portal desde el navegador.** Abre tu enlace de Vercel: te lleva a *Configurar el portal*. Escribe el código de instalación, crea tu contraseña de CEO y marca al equipo (Jorge, Mariana, Leonardo, Omar). Te muestra **una contraseña temporal por persona** (solo esa vez): cópialas y mándaselas; cada quien la cambia en *Mi perfil*. Esta pantalla se cierra sola en cuanto hay usuarios.

Opcional:
- **Agente IA:** agrega `ANTHROPIC_API_KEY` (Claude, de [console.anthropic.com](https://console.anthropic.com)) u `OPENAI_API_KEY` (ChatGPT, de [platform.openai.com](https://platform.openai.com/api-keys)) y vuelve a desplegar. Si están las dos, usa Claude.
- **Dominio propio:** *Settings → Domains* (por ejemplo `portal.tuagencia.mx`).
- **En el celular:** abre el enlace y usa *Agregar a pantalla de inicio*.

### Resumen diario por correo (opcional)

Cada mañana (7:00 Monterrey) el portal manda a cada quien sus pendientes: entregas, adeudos, recibos, postventa y seguimientos. Para encenderlo:
1. Crea una cuenta gratis en [resend.com](https://resend.com) y copia tu API key.
2. En Vercel → Settings → Environment Variables agrega `RESEND_API_KEY` y `CRON_SECRET` (cualquier texto largo). Vuelve a desplegar.
3. Cada usuario pone su correo en **Mi perfil**.

Sin dominio propio, Resend solo entrega al correo con el que abriste la cuenta. Para mandar a todo el equipo, verifica un dominio en Resend y agrega `RESUMEN_REMITENTE` (ej. `Park Point <avisos@tudominio.com>`).

### Reporte semanal (opcional)

Cada lunes a las 7:30 (Monterrey) llega el embudo de la semana pasada, de lunes a domingo:

| Paso | Qué cuenta |
|---|---|
| Prospectos nuevos | Los que entraron al CRM (landing, Meta, cotizador o a mano) |
| Contactados | Los que pasaron a Contactado o más adelante |
| Citas | Los que llegaron a Cita o Prueba de manejo |
| Propuestas | Los que llegaron a Cotizado (la propuesta de flotilla o la cotización ya se mandó) |
| Cierres | Los que llegaron a Apartado o Entregado |

Cada número se compara contra la semana anterior (▲▼). El correo también trae:
- **Flotillas:** el mismo embudo solo con prospectos de "Landing flotillas" o "Flotilla", y las unidades potenciales de los nuevos.
- **Tu mes:** unidades vendidas y cuántas faltan para el escalón de 7 y de 13.
- **Sin contactar:** prospectos que llevan más de un día en Nuevo.
- **Foco de esta semana:** una sola acción, según dónde se atora el embudo.
- **Dirección:** el embudo de toda la agencia y una tabla con cada asesor.

Se cuenta con el historial de etapas (`prospecto_etapas`), que se llena solo cada vez que un prospecto cambia de etapa en el CRM. Si nadie mueve al prospecto en el portal, no aparece en el reporte. A un asesor sin movimiento en dos semanas, sin pendientes y sin ventas no se le manda.

Usa las mismas `RESEND_API_KEY` y `CRON_SECRET` del resumen diario. Por WhatsApp es opcional:
1. Crea en WhatsApp Manager la plantilla **Reporte semanal**: categoría Utilidad, idioma español (México), sin imagen.
   - Cuerpo: "Hola {{1}}, este es tu reporte de la semana del {{2}}. Prospectos nuevos: {{3}}. Contactados: {{4}}. Citas: {{5}}. Propuestas: {{6}}. Cierres: {{7}}. Unidades del mes: {{8}}. Foco de esta semana: {{9}} El detalle está en tu correo y en el portal."
   - Pie: "Reporte interno Park Point. Para dejar de recibirlo, avisa a tu gerente."
2. Pon su nombre en `WHATSAPP_PLANTILLA_REPORTE`.
3. Pon en `REPORTE_WHATSAPP` los usuarios que lo pidieron, separados por coma (ej. `alex,jorge`). Les llega al teléfono de su perfil. Para dar de baja a alguien, quítalo de la lista.

Para probarlo sin esperar al lunes, usa tu `CRON_SECRET`:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://TU-PORTAL.vercel.app/api/cron/reporte-semanal?simular=1"
```
- `simular=1` regresa los números sin mandar nada.
- `para=<usuario>` lo manda solo a esa persona.
- `fecha=AAAA-MM-DD` reporta la semana anterior a esa fecha.

### Archivos del expediente

Se guardan en **Supabase Storage**, en un bucket privado `expedientes` que el portal crea solo la primera vez que alguien sube un archivo (no hay que configurar nada). Nadie entra directo al bucket: el portal revisa permisos y firma URLs de 2 minutos para subir o abrir cada archivo. El plan gratis incluye 1 GB; para ahorrar espacio, lo que ya está en Google Drive se puede **enlazar** en lugar de subirlo. Límite por archivo: 25 MB.

### Variables de entorno

| Variable | De dónde sale | Para qué |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (o `…_PUBLISHABLE_KEY`) | La integración de Supabase | Conexión con la sesión de cada usuario |
| `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`) | La integración de Supabase | Login y administración del equipo (solo en el servidor) |
| `POSTGRES_URL` (o `DATABASE_URL`) | La integración de Supabase | Crear y actualizar las tablas en cada despliegue |
| `CODIGO_INSTALACION` | Tú | Proteger la configuración inicial |
| `LEADS_TOKEN` | Tú | Recibir prospectos automáticos |
| `ANTHROPIC_API_KEY` u `OPENAI_API_KEY` | Anthropic u OpenAI (opcional) | Agente IA (Claude o ChatGPT) |
| `OPENAI_MODEL` | Tú (opcional) | Modelo de ChatGPT; por omisión `gpt-4o-mini` |
| `AVISO_PRIVACIDAD_URL` | La agencia (opcional) | Link al aviso de privacidad que muestra la landing de flotillas |
| `CALENDLY_URL` | Calendly (opcional) | Botón "Agendar prueba de manejo" en la pantalla de gracias de la landing de flotillas |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` | Meta, WhatsApp Business Platform (opcional) | Mensajes automáticos de la landing de flotillas |
| `WHATSAPP_PLANTILLA_FLOTILLA`, `WHATSAPP_PLANTILLA_ASESOR` | WhatsApp Manager (opcional) | Nombres de las plantillas aprobadas (ver abajo) |
| `RESEND_API_KEY`, `CRON_SECRET`, `RESUMEN_REMITENTE` | Resend y tú (opcional) | Resumen diario y reporte semanal por correo |
| `WHATSAPP_PLANTILLA_REPORTE`, `REPORTE_WHATSAPP` | WhatsApp Manager y tú (opcional) | Reporte semanal por WhatsApp y a qué usuarios les llega |
| `WHATSAPP_IDIOMA`, `WHATSAPP_API_VERSION`, `SITIO_URL` | Tú (opcional) | Idioma de las plantillas (`es_MX`), versión de la API de Meta (`v23.0`) y dominio para las imágenes |

### Sin la integración de Vercel (alternativa)

Crea el proyecto en [supabase.com](https://supabase.com), copia `.env.example` como `.env.local`, llena las llaves (*Project Settings → API* y *Connect → Session pooler*) y corre `npm install && npm run setup`: crea tablas, catálogo y al equipo de `src/lib/equipo-inicial.json`, e imprime las contraseñas temporales. Luego despliega en Vercel con las mismas variables.

## Prospectos automáticos (landing y Meta)

Cada prospecto que llega se guarda en el CRM como **Nuevo**, con siguiente acción "Contactar por WhatsApp en menos de 5 minutos", y se asigna **por turno** al asesor con menos prospectos del día. Si el mismo teléfono vuelve a escribir en 30 días, se agrega la nota al prospecto que ya existe.

- **Landing** (`landing.html` de este repositorio): en `assets/config.js` pon
  `webhookUrl: "https://TU-PORTAL.vercel.app/api/leads?token=TU_LEADS_TOKEN"`.
- **Meta Lead Ads, Chattrace o cualquier formulario** (vía Make/Zapier): un módulo HTTP *POST* a `https://TU-PORTAL.vercel.app/api/leads` con el encabezado `Authorization: Bearer TU_LEADS_TOKEN` y un JSON con `nombre`, `telefono`, `modelo` y opcionalmente `origen`, `mensaje`, `utm_campaign`. También acepta el formato de Meta (`field_data` con `full_name` y `phone_number`).

## Landing de flotillas y WhatsApp automático

`/flotillas` es una página pública para empresas, fraccionamientos, municipios y desarrolladoras:
- calculadora de ahorro contra gasolina;
- modelos recomendados para cada uso;
- formulario que entra al CRM como **Landing flotillas**. Con 5 unidades o más entra como prospecto caliente.

Con `?a=<usuario>` el prospecto le llega a ese asesor; sin él, se reparte por turno.

**Propuesta lista para mandar.** Cada prospecto de flotilla tiene en el CRM el botón **Propuesta de flotilla**. Abre `/propuesta/<id>` con:
- los datos que el cliente dejó en la landing;
- los modelos recomendados con precio público;
- el ahorro estimado y el beneficio fiscal, o la nota de contratación si es municipio.

El asesor ajusta unidades, modelo y precio de flotilla autorizado, y la guarda como PDF desde el navegador. Cada asesor solo abre sus prospectos (permisos por fila); dirección abre todos. Los datos de la landing se guardan en la columna `datos` de `prospectos`.

**Mensajes automáticos (opcional).** Si el cliente marca "Quiero recibir la propuesta por WhatsApp" y están las variables de WhatsApp, al enviar el formulario:
1. Al cliente le llega en automático una plantilla con la foto del modelo recomendado y su ahorro estimado.
2. Al asesor le llega un aviso con los datos del prospecto.

Los envíos salen después de responder, así que el cliente no espera. Sin las variables, todo lo demás funciona igual.

Para activarlo:
1. En [Meta Business](https://business.facebook.com), agrega un número a WhatsApp Business Platform y copia el **Phone number ID** y un **token permanente** de usuario del sistema. Ponlos en `WHATSAPP_PHONE_ID` y `WHATSAPP_TOKEN`.
2. En **WhatsApp Manager → Plantillas**, crea y espera la aprobación de las dos plantillas siguientes. Luego pon sus nombres en `WHATSAPP_PLANTILLA_FLOTILLA` y `WHATSAPP_PLANTILLA_ASESOR`.
   - **Cliente**, categoría Marketing, encabezado de imagen, idioma español (México). Cuerpo: "Hola {{1}}, gracias por tu interés en una flotilla BYD de {{2}} unidades. Con los datos que nos diste, el ahorro estimado es de hasta {{3}} al año. {{4}}, tu asesor de flotillas, te escribe hoy para preparar tu propuesta. Responde a este mensaje si quieres agendar una prueba de manejo para tu equipo." Pie: "Ahorro estimado; no es una oferta."
   - **Asesor**, categoría Utilidad, sin imagen. Cuerpo: "Nuevo prospecto de flotilla: {{1}}, {{2}}, {{3}} unidades. WhatsApp: {{4}}. Contáctalo en menos de 5 minutos."
3. Vuelve a desplegar. Si un envío falla, el error aparece en los logs de Vercel y el prospecto ya quedó guardado en el CRM.

WhatsApp solo deja escribir primero con plantillas aprobadas y a quien aceptó recibir mensajes: por eso la casilla de la landing está desmarcada hasta que el cliente la marca. Meta cobra cada conversación iniciada con plantilla.

## Operación del día a día

- **Cambió la oferta del mes:** dirección entra a *Catálogo y precios* y edita precio y bono. Las ventas ya registradas no cambian.
- **Metas del mes:** *Objetivos* → cambia los números → *Guardar metas*. Si un mes no tiene metas guardadas usa las iniciales (14 unidades y 50% por producto, editables en *Catálogo → Trámites y parámetros*).
- **Llega un asesor nuevo:** *Equipo → Dar de alta*. Copia el mensaje con usuario y contraseña temporal y mándaselo por WhatsApp.
- **Alguien olvidó su contraseña:** *Equipo → Contraseña* genera una nueva.
- **Alguien se va:** *Equipo → Editar →* desmarca *Acceso activo*. Su cuenta queda bloqueada y sus ventas se conservan.
- **Reporte para el grupo:** *Tablero de reporte → Descargar imagen* (o *Compartir* desde el celular).

## Desarrollo

```bash
npm run dev         # servidor local
npm test            # cotizador, reportes, VIN y permisos por rol
npm run lint        # estilo
npm run typecheck   # tipos
npm run build       # compilación de producción
```

Las pruebas de permisos (`tests/permisos.test.ts`) corren contra un Postgres real si defines `DATABASE_URL_PRUEBAS`; sin ella se saltan. GitHub Actions (`.github/workflows/saas.yml`) las corre en cada cambio con Postgres 16, junto con lint, tipos y build.

```
src/
  app/
    login/  bienvenida/  salir/        acceso: elegir usuario, contraseña, "Eres…"
    instalar/                          configuración inicial desde el navegador
    (portal)/                          pantallas con sesión (una carpeta por módulo, con sus acciones de servidor)
    api/agente/  api/leads/            Agente IA y prospectos automáticos
  components/                          piezas de interfaz (ui.tsx, cliente.tsx, marco, tablero, ventas)
  lib/
    dominio/                           reglas del negocio sin dependencias: Banorte, fechas, VIN, reportes, catálogos
    datos.ts  sesion.ts  supabase/     acceso a datos con la sesión del usuario
    academia.ts                        contenido de la Academia
  proxy.ts                             refresca la sesión y protege las rutas
supabase/
  migrations/                          esquema y permisos (RLS)
  seed.sql                             agencia y catálogo
scripts/migrar.ts                      tablas y catálogo (corre solo en cada despliegue)
scripts/setup.ts                       configuración desde la terminal (alternativa)
```

## Siguiente fase sugerida

1. **WhatsApp Business API**: seguimientos día 1, 3, 7, 14 y 30 y avisos de cada paso del expediente.
2. **Checador integrado**: asistencia y reportes por hora (hoy en el bot de Telegram).
3. **Comisiones**: cálculo por unidad y por producto vendido, con el esquema de pago de la agencia.
4. **Más agencias**: alta de agencia, usuarios por agencia y cobro de suscripción.
