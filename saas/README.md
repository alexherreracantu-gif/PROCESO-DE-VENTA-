# Park Point · portal interno de ventas

App para el equipo de **BYD Cumbres · Park Point**: cada quien entra con su usuario y contraseña, registra sus ventas (VIN, número de cliente, modelo, color y productos), sigue sus metas y su corte de piso, y dirección ve todo el equipo con un tablero que se descarga como imagen para WhatsApp.

Hecho con **Next.js 16 + Supabase (Postgres, Auth, permisos por fila) + Vercel**.

Identidad **BYD Grupo TEC** en colores claros: fondo blanco, barra lateral blanca y azul de marca `#159BE6` en acentos. Logo en `public/marca/` (azul para fondos claros, blanco para el reporte descargable) e íconos de la app en `public/iconos/`. Si cambia el logo, reemplaza esos archivos.

**Partes escondidas por ahora:** el Agente IA (menú), la tarjeta *Seguimientos para hoy* del Inicio y el CEO en el inicio de sesión (entran Jorge, Mariana, Leonardo y Omar; Jorge administra). Siguen en el código y funcionando; para mostrarlas, cambia a `true` lo que corresponda en `VISIBLE` (`src/lib/config.ts`).

## Qué hace

| Módulo | Para qué |
|---|---|
| **Inicio** | Te dice quién eres, tu avance del mes (unidades, faltan, ritmo por semana, productos por unidad), ranking del equipo, seguimientos de hoy y ventas en proceso. |
| **Ventas** | Alta de cada venta (se guarda completa o no se guarda): fecha, vendedor, cliente, número de cliente, VIN (valida 17 caracteres y que no se repita), modelo, color y nombre comercial, forma de pago, plaza, estatus, fecha de entrega y productos. Cada venta tiene su **expediente de 11 pasos**, su **cuadre sin adeudo** (enganche restante, desembolso esperado contra real, saldo y si el carro sale) y un **historial de cambios**. |
| **Dashboard general** (`/panel`) | El tablero de todo el equipo **sin iniciar sesión**, de solo lectura: indicadores, ranking, productos, modelos, colores y detalle de ventas. Se actualiza solo cada 5 minutos (para dejarlo en una pantalla). Es público: cualquiera con el enlace ve las cifras y el detalle. |
| **Tablero de reporte** | Por mes y por vendedor: unidades contra meta y contra el mes anterior, penetración por producto, ranking, modelos, colores y detalle. **Descargar imagen** (PNG), **Compartir** desde el celular y **Exportar Excel** (CSV). |
| **Objetivos** | Meta de unidades por vendedor y meta de penetración por producto, por mes. Dirección las edita; el equipo ve su avance. |
| **Corte de piso** | Contadores del día (clientes nuevos, citas, demos, solicitudes…) que se guardan solos; texto listo para WhatsApp. Dirección ve el corte de todos. |
| **Prospectos (CRM)** | Tablero de Nuevo a Referidor con siguiente acción y fecha; avisa los vencidos; **Convertir en venta** con un clic. Recibe prospectos automáticos de la landing y de Meta, repartidos por turno. |
| **Cotizador** | Fórmulas Banorte Plan Tradicional (convenio por % de enganche, comisión × 1.16, bono desde 5%), modo "quiere pagar X a la firma", plazos lado a lado y aviso de cuánto aportar para bajar de tasa. |
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

### Sin la integración de Vercel (alternativa)

Crea el proyecto en [supabase.com](https://supabase.com), copia `.env.example` como `.env.local`, llena las llaves (*Project Settings → API* y *Connect → Session pooler*) y corre `npm install && npm run setup`: crea tablas, catálogo y al equipo de `src/lib/equipo-inicial.json`, e imprime las contraseñas temporales. Luego despliega en Vercel con las mismas variables.

## Prospectos automáticos (landing y Meta)

Cada prospecto que llega se guarda en el CRM como **Nuevo**, con siguiente acción "Contactar por WhatsApp en menos de 5 minutos", y se asigna **por turno** al asesor con menos prospectos del día. Si el mismo teléfono vuelve a escribir en 30 días, se agrega la nota al prospecto que ya existe.

- **Landing** (`landing.html` de este repositorio): en `assets/config.js` pon
  `webhookUrl: "https://TU-PORTAL.vercel.app/api/leads?token=TU_LEADS_TOKEN"`.
- **Meta Lead Ads, Chattrace o cualquier formulario** (vía Make/Zapier): un módulo HTTP *POST* a `https://TU-PORTAL.vercel.app/api/leads` con el encabezado `Authorization: Bearer TU_LEADS_TOKEN` y un JSON con `nombre`, `telefono`, `modelo` y opcionalmente `origen`, `mensaje`, `utm_campaign`. También acepta el formato de Meta (`field_data` con `full_name` y `phone_number`).

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
