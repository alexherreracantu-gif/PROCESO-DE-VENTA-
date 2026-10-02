/*
 * DATOS DEL PORTAL BYD PARK POINT
 * Usuarios, catálogo, productos (KPIs), colores, etapas del CRM, corte de piso y guiones.
 * Si cambia algo en la agencia (precios del mes, un asesor nuevo), se cambia aquí.
 */
(function () {
  // ---------- Equipo ----------
  // rol: "ceo" | "gerente" | "asesor". vende: aparece como vendedor en ventas, metas y reportes.
  var USUARIOS = [
    { id: "ceo", nombre: "CEO", completo: "Dirección general", rol: "ceo", vende: false },
    { id: "jorge", nombre: "Jorge", completo: "Jorge Cabral", rol: "gerente", vende: true },
    { id: "mariana", nombre: "Mariana", completo: "Mariana", rol: "asesor", vende: true },
    { id: "leonardo", nombre: "Leonardo", completo: "Leonardo", rol: "asesor", vende: true },
    { id: "omar", nombre: "Omar", completo: "Omar Cantú", rol: "asesor", vende: true },
  ];
  var ROLES = { ceo: "CEO", gerente: "Gerente", asesor: "Asesor" };

  // ---------- Productos que se miden en cada venta (KPIs) ----------
  var PRODUCTOS = [
    { id: "garantia", label: "Garantía extendida", corto: "Garantía", precio: 9082 },
    { id: "accesorios", label: "Accesorios", corto: "Accesorios", precio: 6500 },
    { id: "cerocible", label: "Cerocible", corto: "Cerocible", precio: 4592 },
    { id: "llantas", label: "Seguro de llantas", corto: "Seg. llantas", precio: 4487 },
    { id: "placas", label: "Trámite de placas", corto: "Placas", precio: 3016 },
    { id: "seguro", label: "Seguro", corto: "Seguro", precio: null },
    { id: "refaccion", label: "Llanta de refacción", corto: "Refacción", precio: null },
  ];

  // ---------- Colores de unidad ----------
  var COLORES = [
    { id: "Blanco", hex: "#f4f4f2" },
    { id: "Negro", hex: "#141518" },
    { id: "Gris", hex: "#6b7078" },
    { id: "Plata", hex: "#c3c7cc" },
    { id: "Azul", hex: "#2f5a9e" },
    { id: "Verde", hex: "#4f7a5a" },
    { id: "Rojo", hex: "#a8322d" },
    { id: "Arena", hex: "#c9b48f" },
    { id: "Rosa", hex: "#d9a3b0" },
    { id: "Morado", hex: "#6a4f8a" },
    { id: "Otro", hex: "#9aa0a8" },
  ];

  // ---------- Catálogo (oferta sep-2026; actualizar cada mes) ----------
  // motor: "electrico" | "hibrido". bono: bono flexible, solo financiando desde 5% de enganche.
  var MODELOS = [
    { id: "dolphin-mini-300", nombre: "Dolphin Mini 300 km", anio: "2026", motor: "electrico", precio: 399800, bono: 25000, pitch: "Entrada tecnológica a BYD. Eléctrico, compacto y bien equipado. Nunca lo vendas como “barato”." },
    { id: "dolphin-mini-380", nombre: "Dolphin Mini 380 km", anio: "2026", motor: "electrico", precio: 415800, bono: 30000, pitch: "Misma personalidad del Mini, con más autonomía para trayectos metropolitanos." },
    { id: "yuan-pro-dmi", nombre: "Yuan Pro DM-i", anio: "2027", motor: "hibrido", precio: 519999, bono: 20000, pitch: "SUV compacto híbrido. Cuando el cliente quiere altura y no quiere depender del enchufe." },
    { id: "king-gl-27", nombre: "King GL DM-i", anio: "2027", motor: "hibrido", precio: 524900, bono: 25000, pitch: "Más potencia, menos gasto. Producto héroe de Park Point. Tasa 7.18% con 50% de enganche." },
    { id: "yuan-pro-ev", nombre: "Yuan Pro EV", anio: "2026", motor: "electrico", precio: 536500, bono: 0, pitch: "SUV 100% eléctrico. Cuando el cliente ya recarga en casa o en el trabajo." },
    { id: "king-gs-27", nombre: "King GS DM-i", anio: "2027", motor: "hibrido", precio: 579900, bono: 0, pitch: "King con más equipo. Súbelo cuando el GL se queda corto en confort." },
    { id: "song-pro", nombre: "Song Pro DM-i", anio: "2026", motor: "hibrido", precio: 599880, bono: 35000, pitch: "SUV familiar sin brincar a Song Plus. Espacio + DM-i." },
    { id: "seal-rwd", nombre: "Seal RWD", anio: "2026", motor: "electrico", precio: 778800, bono: 0, pitch: "Sedán eléctrico de manejo. Diseño coupé." },
    { id: "song-plus", nombre: "Song Plus DM-i", anio: "2026", motor: "hibrido", precio: 778800, bono: 78000, pitch: "El SUV de volumen premium. El bono más visible del piso." },
    { id: "seal-awd", nombre: "Seal AWD", anio: "2026", motor: "electrico", precio: 888800, bono: 0, pitch: "Seal con doble motor. Desempeño sin gasolina." },
    { id: "shark-gl", nombre: "Shark GL DMO", anio: "2026", motor: "hibrido", precio: 899980, bono: 55000, pitch: "Pickup híbrida. No prometas specs sin confirmar versión." },
    { id: "sealion-7", nombre: "Sealion 7", anio: "2026", motor: "electrico", precio: 949800, bono: 61700, pitch: "SUV cupé eléctrico. Cuando Song Plus no es suficientemente premium." },
    { id: "shark-gs", nombre: "Shark GS DMO", anio: "2026", motor: "hibrido", precio: 969800, bono: 55000, pitch: "Shark tope de línea. Mismo DMO, más equipo." },
    { id: "m9", nombre: "M9", anio: "2026", motor: "hibrido", precio: 979800, bono: 100000, pitch: "MPV premium de tres filas. Cliente de 6–7 plazas o ejecutivo." },
    { id: "atto-8", nombre: "Atto 8", anio: "2026", motor: "hibrido", precio: 1199800, bono: 0, pitch: "SUV insignia. Solo si hay unidad y el cliente ya está en ese ticket." },
  ];

  var TRAMITES = {
    placasEvMty: 1760, placasHybMty: 5866, gestoria: 3016, permisoFrontera: 1199,
    wallbox: 9744, kitAcc: 6500, cerocible: 4592, llantas: 4487, garantiaExt: 9082, separacion: 5000,
  };

  // ---------- Fórmulas Banorte Plan Tradicional (validadas al centavo) ----------
  function trunc(n) { return isFinite(n) ? Math.trunc(n * 100 + Number.EPSILON) / 100 : 0; }
  function tasaMensual(anual) { return anual * 1.16 * 30.41 / 360; }
  function pmt(monto, anual, n) {
    if (monto <= 0 || n <= 0) return 0;
    var r = tasaMensual(anual);
    if (!r) return trunc(monto / n);
    return trunc(monto * r / (1 - Math.pow(1 + r, -n)));
  }
  function convenio(pct, modelo) {
    if (pct >= 0.5 && modelo.id === "king-gl-27") return { label: "BYD KING DM-i 2027", tasa: 0.0718, comision: 0.02 };
    if (pct >= 0.5 && modelo.motor === "electrico") return { label: "BYD ELECTRIC WEEKEND", tasa: 0.0718, comision: 0.025 };
    if (pct >= 0.5) return { label: "BYD 7.88%", tasa: 0.0788, comision: 0.02 };
    if (pct >= 0.4) return { label: "BYD ESP 2%", tasa: 0.1088, comision: 0.02 };
    if (pct >= 0.25) return { label: "BYD ESP 2%", tasa: 0.1188, comision: 0.02 };
    if (pct >= 0.2) return { label: "BYD ESP 2%", tasa: 0.1388, comision: 0.02 };
    return { label: "Sin convenio", tasa: 0.1499, comision: 0.025 };
  }
  // i: { modelo, aportacion, accesorios, garantia, plazo, placas, tramites }
  function cotizar(i) {
    var m = i.modelo;
    var base = m.precio + i.accesorios;
    var bonoAplica = base > 0 && (i.aportacion + m.bono) / base >= 0.05;
    var bono = bonoAplica ? m.bono : 0;
    var enganche = i.aportacion + bono;
    var pct = base > 0 ? enganche / base : 0;
    var c = convenio(pct, m);
    var monto = Math.max(0, m.precio + i.accesorios + i.garantia - enganche);
    var comision = trunc(c.comision * 1.16 * monto);
    return {
      bono: bono, bonoAplica: bonoAplica, enganche: enganche, pct: pct, convenio: c, monto: monto, comision: comision,
      mensualidad: pmt(monto, c.tasa, i.plazo),
      firma: trunc(i.aportacion + comision + i.placas + i.tramites),
    };
  }

  // ---------- CRM ----------
  var ETAPAS = [
    { id: "nuevo", label: "Nuevo" }, { id: "contactado", label: "Contactado" }, { id: "cita", label: "Cita" },
    { id: "prueba", label: "Prueba" }, { id: "cotizado", label: "Cotizado" }, { id: "credito", label: "Crédito" },
    { id: "apartado", label: "Apartado" }, { id: "entregado", label: "Entregado" }, { id: "referidor", label: "Referidor" },
  ];
  var ORIGENES = ["Park Point", "QR Park Point", "Meta Ads", "Instagram", "Referido", "Flotilla", "Lead viejo", "Otro"];

  // ---------- Corte de piso (por asesor, por día) ----------
  var CORTE = [
    { id: "nuevos", label: "Clientes nuevos" }, { id: "citas", label: "Citas" }, { id: "regresos", label: "Regresos" },
    { id: "prospeccion", label: "Cliente prospección" }, { id: "domicilio", label: "Visita a domicilio" },
    { id: "facebook", label: "Facebook asesor" }, { id: "demos", label: "Demos" }, { id: "solicitudes", label: "Solicitudes" },
    { id: "facturas", label: "Facturas" }, { id: "separaciones", label: "Separaciones" }, { id: "entregas", label: "Entregas" },
    { id: "firmas", label: "Firmas" },
  ];

  // ---------- Guiones ({n} = nombre del asesor) ----------
  var GUIONES = [
    { t: "Bienvenida Park Point (30 s)", b: "Hola, soy {n} de BYD. ¿Qué te trae hoy? Si quieres, en 5 minutos te armo una mensualidad del modelo que más te convenga." },
    { t: "Diagnóstico", b: "¿Cuántos km haces al día? ¿Quién más lo maneja? ¿Cuánto se te va en gasolina al mes? ¿Traes auto a cuenta o arrancas de cero?" },
    { t: "King en 30 segundos", b: "¿Estás pensando en estrenar este mes? El King 2027 es híbrido enchufable: unos 50 km eléctricos, hasta 1,600 km combinados y alrededor de 27 km/l. Más potencia, menos gasto. ¿Lo pruebas ahora?" },
    { t: "Cotización corta", b: "Te lo dejo fácil: tú pones $50,000 y hay $25,000 de bono (financiando). Te armo la mensualidad a 72 meses con Banorte y te la mando aquí. Sujeto a autorización." },
    { t: "“Está caro”", b: "¿Caro contra qué? Si te parece, hacemos la cuenta con lo que gastas hoy en gasolina y ves la mensualidad neta." },
    { t: "“Lo voy a pensar”", b: "Perfecto. ¿Qué parte te falta pensar: el auto, la mensualidad o el enganche? Así te dejo números claros y agendamos la prueba." },
    { t: "Contado", b: "El bono aplica financiando desde 5% de enganche. A veces sale más barato financiar el mínimo que irte de contado. Te muestro los dos escenarios." },
    { t: "Toma a cuenta", b: "Sí tomamos autos a cuenta. ¿Me compartes marca, año, versión, km y si tiene saldo? Con fotos (frente, laterales, atrás, interiores y tablero) lo mando a evaluación." },
    { t: "Venta de garantía extendida", b: "Para que manejes tranquilo los próximos años: la garantía extendida es de 6 años con kilometraje ilimitado. Se puede incluir en el financiamiento y queda dentro de tu mensualidad." },
    { t: "Venta de seguro de llantas y Cerocible", b: "Dos cosas que casi todos mis clientes agregan: el seguro de llantas, por los baches de Monterrey, y Cerocible, que te cubre el 100% de factura. ¿Te los incluyo en la cotización?" },
    { t: "Follow-up día 1", b: "Hola, te escribo para darte seguimiento a la cotización. Si quieres actualizo números con la promo del mes y vemos qué opción te conviene más." },
    { t: "Cierre", b: "¿Lo apartamos hoy con $5,000 para asegurar bono y color? Completas el resto del enganche en agencia." },
  ];

  // ---------- Herramientas que ya existen ----------
  var HERRAMIENTAS = [
    { t: "Expedientes de venta", d: "Los 11 pasos de cada cliente: banco, Quiter, caja, cuadre y entrega.", url: "https://claude.ai/artifact/PXon5WCWryvEgoRRJBj4xU" },
    { t: "Cotizador Grupo Tec", d: "Fórmula Banorte al centavo y autollenado de Banorte.", url: "https://claude.ai/artifact/UkwoHiv8P9C72w46StfxDt" },
    { t: "Hoja de cotización", d: "Hoja para el cliente con mensualidad, pago a la firma y plazos.", url: "https://claude.ai/artifact/PKjA6Z5hrnJqWDtGnXNo3Z" },
    { t: "Checador BYD", d: "Asistencia y reportes por hora del turno.", url: "https://claude.ai/artifact/L9nncf9qCLdd4SFCJ4u9Jz" },
    { t: "Ruta a las 14", d: "Calculadora de embudo para llegar a 14 unidades.", url: "https://claude.ai/artifact/MDd9Pu7LwQqK9Y2vuNZGGY" },
  ];

  window.PORTAL = {
    agencia: "BYD Cumbres · Park Point",
    grupo: "BYD Grupo TEC",
    metaUnidades: 14,
    metaProducto: 50,
    USUARIOS: USUARIOS, ROLES: ROLES, PRODUCTOS: PRODUCTOS, COLORES: COLORES, MODELOS: MODELOS, TRAMITES: TRAMITES,
    ETAPAS: ETAPAS, ORIGENES: ORIGENES, CORTE: CORTE, GUIONES: GUIONES, HERRAMIENTAS: HERRAMIENTAS,
    cotizar: cotizar,
  };
})();
