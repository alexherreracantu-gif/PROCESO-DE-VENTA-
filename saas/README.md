# Park Point · portal interno de ventas

App para el equipo de **BYD Cumbres · Park Point**: cada quien entra con su usuario y contraseña, registra sus ventas (VIN, número de cliente, modelo, color y productos), sigue sus metas y su corte de piso, y dirección ve todo el equipo con un tablero que se descarga como imagen para WhatsApp.

Hecho con **Next.js 16 + Supabase (Postgres, Auth, permisos por fila) + Vercel**.

## Qué hace

| Módulo | Para qué |
|---|---|
| **Inicio** | Te dice quién eres, tu avance del mes (unidades, faltan, ritmo por semana, productos por unidad), ranking del equipo, seguimientos de hoy y ventas en proceso. |
| **Ventas** | Alta de cada venta: fecha, vendedor, cliente, número de cliente, VIN (valida 17 caracteres y que no se repita), modelo, color y nombre comercial, forma de pago, plaza, estatus, fecha de entrega y productos. Cada venta tiene su **expediente de 11 pasos** y un **historial de cambios**. |
| **Tablero de reporte** | Por mes y por vendedor: unidades contra meta, penetración por producto, ranking, modelos, colores y detalle. **Descargar imagen** (PNG), **Compartir** desde el celular y **Exportar Excel** (CSV). |
| **Objetivos** | Meta de unidades por vendedor y meta de penetración por producto, por mes. Dirección las edita; el equipo ve su avance. |
| **Corte de piso** | Contadores del día (clientes nuevos, citas, demos, solicitudes…) que se guardan solos; texto listo para WhatsApp. Dirección ve el corte de todos. |
| **Prospectos (CRM)** | Tablero de Nuevo a Referidor con siguiente acción y fecha; avisa los vencidos; **Convertir en venta** con un clic. |
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

## Puesta en marcha (una sola vez, ~15 minutos)

1. **Crea el proyecto en Supabase.** Entra a [supabase.com](https://supabase.com), *New project*, elige una contraseña para la base y la región más cercana (us-east-1 funciona bien para Monterrey).

2. **Copia las llaves.** En el proyecto:
   - *Project Settings → API*: `Project URL`, la llave `anon` `public` y la llave `service_role` (secreta).
   - *Connect* (arriba) → *Session pooler* → copia la cadena de conexión y reemplaza `[YOUR-PASSWORD]`.

   En esta carpeta copia `.env.example` como `.env.local` y pega los valores.

3. **Configura todo de un jalón.**
   ```bash
   cd saas
   npm install
   npm run setup
   ```
   Crea las tablas y permisos, carga la agencia y el catálogo (precios de septiembre 2026) y da de alta al equipo de `scripts/equipo.json` (CEO, Jorge Cabral, Mariana, Leonardo y Omar). Al final imprime una **contraseña temporal por persona**: entrégala a cada quien; la cambian en *Mi perfil*. Se puede correr varias veces sin duplicar nada.

4. **Publica en Vercel.** En [vercel.com](https://vercel.com) → *Add New → Project* → importa este repositorio y en **Root Directory** elige `saas`. En *Environment Variables* agrega `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (no hace falta `DATABASE_URL`). *Deploy*.

5. **(Opcional) Agente IA.** Crea una llave en [console.anthropic.com](https://console.anthropic.com) y agrégala en Vercel como `ANTHROPIC_API_KEY`. Sin ella, el módulo aparece apagado.

6. **En el celular**: abre el enlace de Vercel y usa *Agregar a pantalla de inicio*; se abre como app.

Para probar en tu compu: `npm run dev` y entra a <http://localhost:3000>.

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
    (portal)/                          pantallas con sesión (una carpeta por módulo, con sus acciones de servidor)
    api/agente/                        streaming del Agente IA
  components/                          piezas de interfaz (ui.tsx, cliente.tsx, marco, tablero, ventas)
  lib/
    dominio/                           reglas del negocio sin dependencias: Banorte, fechas, VIN, reportes, catálogos
    datos.ts  sesion.ts  supabase/     acceso a datos con la sesión del usuario
    academia.ts                        contenido de la Academia
  proxy.ts                             refresca la sesión y protege las rutas
supabase/
  migrations/                          esquema y permisos (RLS)
  seed.sql                             agencia y catálogo
scripts/setup.ts  scripts/equipo.json  configuración inicial
```

## Siguiente fase sugerida

1. **Expediente completo dentro de cada venta**: cálculos de enganche restante, desembolso esperado y cuadre sin adeudo (hoy viven en la app de Expedientes), con WhatsApps y correos de Piedras Negras.
2. **Prospectos automáticos**: webhook de la landing y de Meta Lead Ads directo al CRM, asignados por turno.
3. **WhatsApp Business API**: seguimientos día 1, 3, 7, 14 y 30 y avisos de cada paso del expediente.
4. **Checador integrado**: asistencia y reportes por hora (hoy en el bot de Telegram).
5. **Más agencias**: alta de agencia, usuarios por agencia y cobro de suscripción.
