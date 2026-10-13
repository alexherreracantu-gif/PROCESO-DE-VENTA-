# Plan: landing de flotillas con mensajes automáticos

Este plan sirve para pasárselo a otra IA (por ejemplo Grok) o a un desarrollador. Dice qué existe, qué ya está construido, cómo funciona el flujo automático y qué falta. No contiene contraseñas ni llaves.

## Instrucción para la IA (copia y pega)

> Soy asesor de ventas de BYD en Monterrey (BYD Grupo TEC, módulo Park Point Cumbres). Quiero vender flotillas (varias unidades) a empresas, fraccionamientos, municipios y desarrolladoras, sin hacer todo a mano. Ya tengo un portal en Next.js 16 + Supabase en Vercel, con CRM y una landing de flotillas que guarda cada prospecto y puede mandar un WhatsApp automático con imagen. Abajo está el plan completo. Revísalo y dime:
> 1. cómo armar una secuencia de seguimiento automática por WhatsApp (día 1, 3, 7 y 14) que respete las reglas de WhatsApp Business y de México;
> 2. qué automatizaciones con IA puedo sumar sin perder el trato humano;
> 3. qué riesgos ves y qué cambiarías.
>
> Respeta las reglas de la sección «Reglas que no se rompen».

## Contexto

- **Producto:** autos BYD eléctricos (Dolphin Mini) e híbridos enchufables DM-i (KING, Song Pro, Shark). Precios públicos con IVA de octubre de 2026: Dolphin Mini $399,800, KING GL $524,900, Song Pro $599,880, Shark GL $899,980. El precio de flotilla lo autoriza la agencia.
- **Por qué flotillas:** el asesor cobra por escalones del mes ($12,000 por venta; $18,000 por venta desde 7 ventas; $22,000 desde 13). Una flotilla de 7 a 13 unidades cruza el escalón de golpe.
- **Pruebas públicas:**
  - BYD México vendió cerca de 10,200 unidades a flotillas en 2025 (14% de sus ventas). Según la marca, trabaja con Lala, Cemex y FEMSA (Expansión, mayo de 2026).
  - Grupo TEC y BYD anunciaron 3,000 taxis BYD en Nuevo León (El Financiero, octubre de 2025).
- **Herramientas que ya existen:**
  - **Portal Next.js 16 + Supabase en Vercel**, con CRM de prospectos que se reparten por turno.
  - **Webhook `/api/leads`**, protegido con token, que acepta el formato de Meta Lead Ads.
  - **Cotizador público `/cotiza`.**
  - **Propuestas en Word** para empresa, municipio y fraccionamiento, más una **calculadora de ahorro en Excel**.

## Lo que ya está construido

**Landing `/flotillas`** (en el portal, carpeta `saas/src/app/flotillas/`):
1. Portada con pruebas sociales y fuentes.
2. Selector de cliente: Empresa, Fraccionamiento, Municipio o Desarrolladora. Cambia el texto y los modelos recomendados.
3. Calculadora de ahorro contra gasolina (unidades, km por día, rendimiento y precio de gasolina), con los supuestos a la vista.
4. Modelos recomendados por uso, con foto y precio público.
5. Beneficios: menor gasto por kilómetro, deducción fiscal para empresas o contratación en regla para municipios, y carga.
6. Formulario: nombre, organización, tipo, WhatsApp, correo, y casilla de consentimiento para WhatsApp (desmarcada por omisión). Tiene campo trampa y tiempo mínimo contra robots.

**Al enviar el formulario:**
1. El prospecto entra al CRM como «Landing flotillas», con unidades, km por día, ahorro estimado y consentimiento. Con 5 unidades o más entra como caliente.
2. Se asigna al asesor del enlace (`/flotillas?a=usuario`) o por turno.
3. Si el cliente aceptó y WhatsApp Business está configurado, el cliente recibe en automático una plantilla con la foto del modelo y su ahorro estimado.
4. El asesor recibe un aviso por WhatsApp con los datos del prospecto.
5. La pantalla de gracias trae un botón para que el cliente escriba al asesor con un mensaje ya armado.

**Variables de entorno de WhatsApp:**
- `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID`
- `WHATSAPP_PLANTILLA_FLOTILLA` y `WHATSAPP_PLANTILLA_ASESOR`
- `WHATSAPP_IDIOMA` (`es_MX`), `WHATSAPP_API_VERSION` (`v23.0`), `SITIO_URL` y `AVISO_PRIVACIDAD_URL`

Los textos de las plantillas están en `saas/README.md`.

## El flujo completo

```
Anuncio de Meta / video en redes / QR / correo a empresas
        ↓
Landing /flotillas (calcula su ahorro)
        ↓
CRM del portal (asignación por turno, siguiente acción: contactar en menos de 5 minutos)
        ├─→ WhatsApp automático al cliente: plantilla con imagen y ahorro estimado
        └─→ WhatsApp automático al asesor: aviso con datos del prospecto
        ↓
Asesor: diagnóstico de 30 minutos → calculadora con datos reales → prueba de manejo
        ↓
Propuesta en Word con precio autorizado → seguimiento → cierre
```

## Lo que falta (para que la IA proponga)

1. **Secuencia de seguimiento automática.** Mensajes los días 1, 3, 7 y 14 si el prospecto no ha respondido; se detiene cuando contesta o cambia de etapa en el CRM. Opciones: Vercel Cron en el portal, Make.com o Chattrace. Cada mensaje fuera de la ventana de 24 horas requiere plantilla aprobada.
2. **Respuestas con IA en WhatsApp** a preguntas frecuentes: carga, servicio, garantía y documentos. Pasa a un humano cuando piden precio de flotilla, tasa o cita. El portal ya tiene un agente con Claude o ChatGPT que conoce el catálogo del mes.
3. **Propuesta automática en PDF** con los datos del formulario (organización, unidades y ahorro), para que el asesor solo la revise y la mande.
4. **Agenda de prueba de manejo** con un enlace de Calendly en la plantilla o en la pantalla de gracias.
5. **Campañas:** anuncios de Meta para dueños y directores en Monterrey, García, Escobedo, Santa Catarina y Apodaca que lleven a `/flotillas`.
6. **Reporte semanal:** prospectos de la landing, respuestas, citas, propuestas y cierres.

## Reglas que no se rompen

- **WhatsApp:** solo se escribe primero a quien marcó la casilla de consentimiento, y solo con plantillas aprobadas por Meta. Cada mensaje automático debe permitir dejar de recibir mensajes.
- **Datos personales:** la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (marzo de 2025) pide aviso de privacidad al recabar datos. Los datos se usan solo para la propuesta y su seguimiento.
- **Publicidad de crédito:** si un mensaje o anuncio dice tasa o mensualidad, va con su CAT, fecha de cálculo, vigencia y «sujeto a aprobación de crédito».
- **Precios y ahorro:** precios con IVA y vigencia (Profeco, NOM-160). El ahorro siempre se presenta como estimación con sus supuestos, nunca como oferta.
- **Municipios:**
  - El proveedor es la agencia (Automóviles Tecnológico, S.A. de C.V.), registrada en el padrón del municipio.
  - La compra sigue la Ley de Adquisiciones de Nuevo León y la Ley de Egresos municipal.
  - Cero regalos, comisiones o beneficios a servidores públicos.
- **Efectivo:** prohibido recibir efectivo por $376,565 o más por vehículo (3,210 UMA de 2026, ley antilavado).
- **Fiscal:** la deducción de hasta $250,000 por auto (o $285 diarios en arrendamiento) es información general; la confirma el contador del cliente.

## Criterios para dar el trabajo por bueno

- Un prospecto de prueba llega al CRM con todos sus datos y se asigna al asesor correcto.
- Con consentimiento, el cliente recibe la plantilla con imagen en menos de un minuto. Sin consentimiento, no recibe nada automático.
- La secuencia se detiene en cuanto el cliente responde o el asesor cambia la etapa.
- Ningún mensaje automático promete precio, tasa ni aprobación de crédito.
- Funciona bien en el celular: la mayoría de los prospectos llegan desde Meta en iPhone o Android.
