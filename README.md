# Proceso de venta de autos: landing + panel del vendedor

Sistema sencillo (HTML estático, sin servidor) para **captar prospectos con Meta Ads** y **llevar cada venta de la cotización a la entrega** sin olvidar ningún paso.

| Archivo | Para qué sirve | Quién lo ve |
|---|---|---|
| `index.html` | Landing pública: modelos, simulador de mensualidad, formulario de precalificación que abre WhatsApp con los datos del cliente | Clientes (tráfico de anuncios) |
| `panel.html` | Panel del vendedor: CRM por etapas, calculadora de cierre, mensajes de WhatsApp, correo de Piedras Negras y checklists | Solo tú |
| `assets/config.js` | **El único archivo que tienes que editar**: tu WhatsApp, modelos, precios, webhook, Pixel de Meta | — |
| `docs/proceso-de-venta.md` | Tu guía de capacitación | Solo tú |

## Cómo fluye todo

```
Anuncio de Meta ──► Landing ──► Formulario ──┬──► WhatsApp con el mensaje ya armado
                                             ├──► Webhook (Make / Chattrace / Google Sheets)
                                             └──► Evento "Lead" en el Pixel de Meta
                                                      │
Panel ◄── pegas el mensaje o llega del webhook ◄──────┘
  │
  ├─ Prospectos: cada tarjeta dice el SIGUIENTE PASO y abre WhatsApp con el mensaje de esa etapa
  ├─ Calculadora de cierre: desembolso esperado, enganche el día de la firma y cuadre (¿sobra o falta?)
  ├─ Piedras Negras: arma el correo con el pago negativo y la aplicación por concepto
  └─ Checklists: alta en Quiter, caja, firma, desembolso, entrega y pendientes por validar
```

## Paso 1: configura tus datos

Abre `assets/config.js` y cambia:

1. `asesor.whatsapp`: tu número con código de país y sin espacios (ej. `5218112345678`).
2. `modelos`: los modelos que vendes. Si pones `precio: null` sale "Cotiza por WhatsApp".
3. `tasaAnualReferencia`: la tasa que maneja el banco con el que más trabajas.
4. `metaPixelId`: el ID de tu Pixel (Administrador de eventos de Meta). Opcional.
5. `webhookUrl`: la URL de tu escenario de Make o de Chattrace. Opcional.
6. `correoPiedrasNegras`: cuando lo confirmes con tu capacitador.

## Paso 2: publícala gratis con GitHub Pages

1. En GitHub: **Settings → Pages**.
2. En *Source* elige **Deploy from a branch**, la rama y la carpeta `/ (root)`. Guarda.
3. En un par de minutos queda en `https://<tu-usuario>.github.io/PROCESO-DE-VENTA-/`.
   - Landing: `.../index.html`
   - Panel: `.../panel.html` (tiene `noindex`, así que Google no lo muestra)

También funciona arrastrando la carpeta a Netlify Drop o subiéndola a Vercel. Con un dominio propio se ve más profesional en los anuncios.

## Paso 3: automatiza con Make (opcional, recomendado)

1. En Make crea un escenario con el módulo **Webhooks → Custom webhook** y copia la URL en `webhookUrl`.
2. Manda un lead de prueba desde la landing para que Make detecte los campos:
   `nombre, telefono, modelo, pago, enganche, cuando, municipio, prioridad, fecha, pagina, utm_source, utm_campaign, utm_content, fbclid`.
3. Conecta lo que quieras después del webhook:
   - **Google Sheets**: una fila por prospecto (tu CRM compartible).
   - **Chattrace / WhatsApp API**: disparar el flujo del bot de precalificación.
   - **Aviso a tu celular** si `prioridad = Caliente`.

La landing manda los datos como formulario (`application/x-www-form-urlencoded`), que Make lee sin configuración extra.

## Paso 4: anuncios en Meta

- Objetivo **Clientes potenciales** o **Ventas** con el Pixel optimizando al evento **Lead**, o **Tráfico** al principio si todavía no hay datos.
- Pon UTM en la URL del anuncio para saber qué creativo vende:
  `?utm_source=meta&utm_campaign=king-credito&utm_content=video-color-interior`
- Segmenta Monterrey y su área metropolitana (radio de 25 a 40 km).
- **Antes de lanzar**, confirma con la agencia qué te permite la marca: logos, fotos oficiales, precios y promociones.

## Sobre los datos

- El panel guarda los prospectos **solo en tu navegador** (`localStorage`). Usa **Respaldo** para descargarlos o pasarlos a otro dispositivo, y **Exportar CSV** para abrirlos en Excel o Sheets.
- No guardes CURP, RFC ni folio de INE en el panel: esos van directo a Quiter.
- La landing trae un aviso de privacidad simplificado. Revísalo y ajústalo con los datos reales antes de publicar.
