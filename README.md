# Portal BYD Park Point (control interno)

`portal.html` es la SaaS interna del equipo de BYD Cumbres · Park Point. Publicada en https://claude.ai/artifact/MRhdyyADYxEcSZvFyZuoPL

- **Inicio de sesión por usuario:** al entrar eliges quién eres (CEO, Jorge Cabral · Gerente, Mariana, Leonardo u Omar · Asesores) y escribes tu PIN de 4 dígitos (la primera vez lo creas). La app te dice con quién entraste y cada quien tiene su sesión.
- **Permisos:** los asesores ven solo sus ventas, prospectos y cortes. Jorge y el CEO ven todo el equipo. Jorge también aparece como vendedor.
- **Ventas:** fecha, vendedor, cliente, número de cliente, VIN (valida 17 caracteres y duplicados), modelo, color (y nombre comercial, ej. Time Grey), forma de pago, plaza, estatus, fecha de entrega y los productos (KPIs): garantía extendida, accesorios, Cerocible, seguro de llantas, trámite de placas, seguro y llanta de refacción.
- **Tablero de reporte:** unidades contra meta, penetración por producto, ranking de vendedores, unidades por modelo y por color, detalle de ventas. Botón **Descargar imagen** (PNG listo para WhatsApp) y **Exportar CSV**.
- **Objetivos:** meta de unidades por vendedor y meta de penetración por producto, por mes (las edita dirección).
- **Corte de piso**, **CRM** de prospectos, **Cotizador** Banorte, **Guiones**, **Agente IA**, **Academia BYD** (de Dealer OS) y **Equipo** (dirección: avance de cada quien y restablecer PIN).

Datos: en claude.ai se comparten con todo el equipo en la base de datos del portal; fuera de ahí se guardan en el navegador. Para que el equipo capture, compárteles el portal con acceso de colaborador. Los datos y el catálogo se editan en `assets/portal-datos.js`; la academia en `assets/portal-academia.js`. Para republicar: `python3 tools/empaquetar.py portal.html salida.html`.

# Expedientes de venta: de la cotización a la entrega

App personal para **aprender el proceso de venta de autos** y **automatizar el llenado de datos**. Das de alta a un cliente y la app te lleva paso a paso, campo por campo, hasta la entrega. En cada paso te dice qué hacer, calcula las cuentas, arma los mensajes y no te deja avanzar si falta algo.

## Cómo se usa

1. Abre `index.html` → **+ Nuevo cliente**.
2. Llena los campos del paso. Los que tienen `*` son obligatorios.
3. Toca **Completar paso →**. Si falta algo, la app te dice qué; si todo está bien, te lleva al siguiente paso.
4. En el tablero **Mis clientes** ves en qué paso va cada venta, cuál es tu siguiente acción y cuáles llevan días sin movimiento.

## Los 11 pasos

| # | Paso | Qué automatiza la app |
|---|---|---|
| 1 | Datos del cliente | Nombre y apellidos que se reutilizan en Quiter. Plaza: Monterrey o Piedras Negras |
| 2 | Cotización | Pone el precio del modelo y arma el WhatsApp con la cotización y los documentos que necesitas |
| 3 | Documentos al banco* | Checklist de documentos y WhatsApp que pide solo los que faltan |
| 4 | Crédito aprobado* | **Bloquea** la separación si el crédito no está aprobado |
| 5 | Separación | Calcula el enganche que queda pendiente y arma el WhatsApp para pedir los $5,000 con el color interior como gancho |
| 6 | Alta en Quiter | Campos en el mismo orden que Quiter, con botón **Copiar** en cada uno. Valida CURP y RFC |
| 7 | Separación en caja | Formato de caja listo para imprimir (Accesorios + código de cliente). Si es Piedras Negras, agrega los pasos extra y arma el correo |
| 8 | Enganche y firma | ¿Qué le vendí? ¿Qué le di? Calcula el enganche restante, la nota de extras, el bono frontera ($ o %) y el desembolso esperado |
| 9 | Desembolso del banco* | Compara el desembolso real contra el esperado |
| 10 | Cuadre sin adeudo | Tabla de cuadre completa. **Bloquea** la entrega si falta aunque sea $1 |
| 11 | Entrega | Fecha estimada (4 días), placas, reseña y referidos |

\* Se saltan automáticamente si la venta es de **contado**.

La sección **Aprende** tiene las reglas de oro, los 11 pasos explicados y tus **pendientes por validar**, con un espacio para anotar la respuesta de tu capacitador.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `portal.html` | Portal BYD Park Point (sesión por usuario, ventas y KPIs, tablero, objetivos, CRM, academia) |
| `assets/portal*.js` | Datos, academia y motor del portal |
| `index.html` | La app de expedientes |
| `assets/pasos.js` | **Los pasos, campos, mensajes y validaciones.** Si tu capacitador te corrige algo, se cambia aquí |
| `assets/config.js` | Tu nombre, WhatsApp, modelos y precios, monto de separación y correo de Piedras Negras |
| `assets/app.js` | El motor de la app (no necesitas tocarlo) |
| `landing.html` | Landing para anuncios de Meta, para cuando quieras conseguir prospectos |
| `docs/proceso-de-venta.md` | Tu guía de capacitación |

## Dónde abrirla

- **Versión publicada (la más fácil):** https://claude.ai/artifact/PXon5WCWryvEgoRRJBj4xU. Ahí tus expedientes se guardan en el espacio privado de tu cuenta de Claude y se ven igual en el celular y en la compu. Para actualizarla después de cambiar algo: `python3 tools/empaquetar.py expedientes.html` y se vuelve a publicar.

- **En tu compu:** doble clic en `index.html`.
- **En el celular (recomendado):** publícala gratis con GitHub Pages (**Settings → Pages →** *Deploy from a branch*, carpeta `/ (root)`). Después ábrela en el navegador del celular y usa "Agregar a pantalla de inicio" para tenerla como app.

## Tus datos

- En la versión publicada en claude.ai, los expedientes se guardan en tu cuenta, en un espacio privado que solo tú ves. Abierta desde tu compu o GitHub Pages, se guardan **solo en ese navegador**.
- Usa **Respaldo** seguido: descarga un archivo con todo, restáuralo en otro dispositivo o exporta a Excel (CSV).
- Al terminar una venta puedes **borrar los datos personales** (CURP, RFC, INE, domicilio) y conservar el registro de la venta.
