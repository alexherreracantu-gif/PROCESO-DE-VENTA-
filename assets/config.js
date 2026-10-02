/*
 * CONFIGURACIÓN GENERAL
 * Edita solo este archivo para personalizar la landing y el panel.
 */
window.CONFIG = {
  asesor: {
    nombre: "Omar",
    titulo: "Asesor automotriz",
    ciudad: "Monterrey, N.L.",
    // WhatsApp con código de país, sin "+", espacios ni guiones. Ej: 5218112345678
    whatsapp: "5218100000000",
    correo: "",
  },

  // Nombre de la marca que vendes (se muestra en textos, sin logos oficiales).
  marca: "BYD",

  // URL de webhook (Make.com, Zapier, n8n o Chattrace) que recibe cada prospecto.
  // Déjala vacía si todavía no la tienes: la landing seguirá mandando al cliente a WhatsApp.
  // Con el portal pro desplegado: "https://TU-PORTAL.vercel.app/api/leads?token=TU_LEADS_TOKEN"
  // (el prospecto entra directo al CRM y se asigna por turno a un asesor).
  webhookUrl: "",

  // ID del Pixel de Meta. Déjalo vacío para no cargarlo.
  metaPixelId: "",

  // Tasa anual de referencia para el simulador (0.139 = 13.9 %). Sin IVA.
  tasaAnualReferencia: 0.139,

  // Monto de la separación. Siempre forma parte del enganche.
  separacion: 5000,

  // Correo al que se mandan las aplicaciones de pago de Piedras Negras (pendiente de validar).
  correoPiedrasNegras: "",

  // Modelos que aparecen en la landing y en el panel.
  // precio: número (valor factura de referencia) o null para "Cotiza por WhatsApp".
  modelos: [
    { id: "king", nombre: "BYD King", tipo: "Sedán híbrido enchufable", precio: 499800 },
    { id: "song-pro", nombre: "BYD Song Pro", tipo: "SUV híbrida enchufable", precio: null },
    { id: "song-plus", nombre: "BYD Song Plus", tipo: "SUV", precio: null },
    { id: "shark", nombre: "BYD Shark", tipo: "Pickup híbrida enchufable", precio: null },
    { id: "dolphin-mini", nombre: "BYD Dolphin Mini", tipo: "Hatchback eléctrico", precio: null },
    { id: "seal", nombre: "BYD Seal", tipo: "Sedán eléctrico", precio: null },
    { id: "yuan-pro", nombre: "BYD Yuan Pro", tipo: "SUV eléctrica", precio: null },
  ],
};
