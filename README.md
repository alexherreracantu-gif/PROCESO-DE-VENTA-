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
| `index.html` | La app de expedientes |
| `assets/pasos.js` | **Los pasos, campos, mensajes y validaciones.** Si tu capacitador te corrige algo, se cambia aquí |
| `assets/config.js` | Tu nombre, WhatsApp, modelos y precios, monto de separación y correo de Piedras Negras |
| `assets/app.js` | El motor de la app (no necesitas tocarlo) |
| `landing.html` | Landing para anuncios de Meta, para cuando quieras conseguir prospectos |
| `docs/proceso-de-venta.md` | Tu guía de capacitación |

## Dónde abrirla

- **En tu compu:** doble clic en `index.html`.
- **En el celular (recomendado):** publícala gratis con GitHub Pages (**Settings → Pages →** *Deploy from a branch*, carpeta `/ (root)`). Después ábrela en el navegador del celular y usa "Agregar a pantalla de inicio" para tenerla como app.

## Tus datos

- Los expedientes se guardan **solo en el navegador donde los capturas**. No se suben a ningún lado.
- Usa **Respaldo** seguido: descarga un archivo con todo, restáuralo en otro dispositivo o exporta a Excel (CSV).
- Al terminar una venta puedes **borrar los datos personales** (CURP, RFC, INE, domicilio) y conservar el registro de la venta.
