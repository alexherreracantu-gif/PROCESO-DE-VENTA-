/*
 * PASOS DEL PROCESO DE VENTA
 * Cada paso tiene: qué lograr (objetivo), cómo hacerlo (coach), los campos que llenas,
 * las acciones automáticas (WhatsApp, correo, impresión) y las validaciones para avanzar.
 * Si tu capacitador te corrige algo, cámbialo aquí.
 */
(function () {
  var C = window.CONFIG || {};
  var n = function (v) { var x = Number(v); return isFinite(x) ? x : 0; };
  var mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
  var $$ = function (v) { return mxn.format(Math.round(n(v) * 100) / 100); };
  var vacio = function (v) { return v === undefined || v === null || v === ""; };
  var contado = function (e) { return e.formaPago === "Contado"; };
  var pn = function (e) { return e.plaza === "PN"; };
  var hoy = function () { return new Date().toISOString().slice(0, 10); };
  var nombreCompleto = function (e) { return [e.nombre, e.apPaterno, e.apMaterno].filter(Boolean).join(" "); };
  var primerNombre = function (e) { return String(e.nombre || "").trim().split(/\s+/)[0] || ""; };

  var EXTRAS = [
    { id: "exGarantia", label: "Garantía extendida" },
    { id: "exInstalacion", label: "Instalación" },
    { id: "exKit", label: "Kit de accesorios" },
    { id: "exLlantas", label: "Seguro de llantas" },
    { id: "exPlacas", label: "Placas (gestoría)" },
    { id: "exOtro", label: "Otro extra" },
  ];

  // ---------- Cálculos automáticos ----------
  var calc = {
    separacion: function (e) { return vacio(e.montoSeparacion) ? (C.separacion || 5000) : n(e.montoSeparacion); },
    enganche: function (e) { return vacio(e.engancheTotal) ? n(e.engancheAprobado) : n(e.engancheTotal); },
    engancheRestante: function (e) { return Math.max(calc.enganche(e) - calc.separacion(e), 0); },
    frontera: function (e) { return e.bonoFronteraModo === "pct" ? n(e.valorFactura) * n(e.bonoFrontera) / 100 : n(e.bonoFrontera); },
    bonos: function (e) { return n(e.bonosAgencia) + calc.frontera(e); },
    extras: function (e) { return EXTRAS.reduce(function (s, x) { return s + n(e[x.id]); }, 0); },
    extrasDetalle: function (e) { return EXTRAS.filter(function (x) { return n(e[x.id]) > 0; }).map(function (x) { return x.label + " " + $$(e[x.id]); }); },
    esperado: function (e) { return contado(e) ? 0 : Math.max(n(e.valorFactura) - calc.enganche(e) - n(e.bonosAgencia), 0); },
    desembolso: function (e) { return contado(e) ? 0 : (vacio(e.desembolsoReal) ? calc.esperado(e) : n(e.desembolsoReal)); },
    totalContado: function (e) { return Math.max(n(e.valorFactura) - calc.bonos(e), 0) + calc.extras(e); },
    cubierto: function (e) { return calc.enganche(e) + calc.bonos(e) + calc.desembolso(e) + n(e.pagoAdicional); },
    cargos: function (e) { return n(e.valorFactura) + calc.extras(e); },
    saldo: function (e) { return Math.round((calc.cubierto(e) - calc.cargos(e)) * 100) / 100; },
    fechaEntrega: function (e) {
      var base = e.fechaDesembolso || e.fechaFirma;
      if (!base) return "";
      var d = new Date(base + "T12:00:00");
      d.setDate(d.getDate() + 4);
      return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    },
  };

  function veredicto(e) {
    var s = calc.saldo(e);
    if (s > 0) return { tone: "ok", text: "Sobran " + $$(s) + ". Sin adeudo: el sobrante queda en Accesorios como saldo a favor del cliente. El carro puede salir." };
    if (s === 0) return { tone: "ok", text: "Cuadra en $0. Sin adeudo: el carro puede salir." };
    return { tone: "bad", text: "Faltan " + $$(-s) + ". Hay adeudo: el carro NO sale hasta liquidarlo. Revisa pagos mal aplicados o liquida la diferencia en caja." };
  }

  var MODELOS = (C.modelos || []).map(function (m) { return m.nombre; }).concat(["Otro"]);
  var PLAZOS = ["12", "24", "36", "48", "60", "72"];

  // ---------- Pasos ----------
  var PASOS = [
    {
      id: "cliente",
      titulo: "Datos del cliente",
      objetivo: "Registrar al cliente y definir si la venta va por Monterrey o por Piedras Negras.",
      coach: [
        "Captura nombre y apellidos por separado: se reutilizan tal cual en el alta de Quiter.",
        "La plaza cambia cómo se aplican los pagos: Monterrey todo en caja; Piedras Negras se cancela y se manda por correo.",
        "Anota de dónde llegó (anuncio, piso, referido) para saber qué te trae más ventas.",
      ],
      campos: [
        { id: "nombre", label: "Nombre(s)", req: true },
        { id: "apPaterno", label: "Apellido paterno", req: true },
        { id: "apMaterno", label: "Apellido materno" },
        { id: "telefono", label: "WhatsApp (10 dígitos)", type: "tel", req: true },
        { id: "email", label: "Email", type: "email" },
        { id: "origen", label: "¿De dónde llegó?", type: "select", opts: ["Anuncio Meta", "WhatsApp", "Piso / agencia", "Referido", "Llamada", "Otro"] },
        { id: "plaza", label: "La venta va por", type: "select", req: true, def: "MTY", opts: [["MTY", "Monterrey"], ["PN", "Piedras Negras"]] },
        { id: "notas", label: "Notas", type: "textarea", full: true },
      ],
      validar: function (e) {
        if (String(e.telefono || "").replace(/\D/g, "").length !== 10) return "El WhatsApp debe tener 10 dígitos.";
      },
    },
    {
      id: "cotizacion",
      titulo: "Cotización",
      objetivo: "Mandar la cotización y pedir en el mismo mensaje los documentos para el banco.",
      coach: [
        "Manda la cotización el mismo día que te la piden: la velocidad cierra ventas.",
        "Pregunta qué color interior le gusta: será tu gancho para la separación.",
        "Si paga de contado, la app se salta los pasos del banco.",
      ],
      campos: [
        { id: "modelo", label: "Modelo", type: "select", req: true, opts: MODELOS, def: MODELOS[0] },
        { id: "version", label: "Versión" },
        { id: "colorExterior", label: "Color exterior" },
        { id: "colorInterior", label: "Color interior", hint: "Tu gancho para cerrar la separación." },
        { id: "valorFactura", label: "Valor factura", type: "money", req: true },
        { id: "formaPago", label: "Forma de pago", type: "select", req: true, def: "Crédito", opts: ["Crédito", "Contado"] },
        { id: "engancheDeseado", label: "Enganche que tiene el cliente", type: "money", show: function (e) { return !contado(e); } },
        { id: "plazoDeseado", label: "Plazo deseado (meses)", type: "select", opts: PLAZOS, def: "48", show: function (e) { return !contado(e); } },
        { id: "fechaCotizacion", label: "Fecha de cotización", type: "date", def: hoy },
        { id: "cotizacionEnviada", label: "Cotización enviada al cliente", type: "check", req: true },
      ],
      acciones: [{ tipo: "wa", tpl: "cotizacion", label: "WhatsApp: cotización y documentos" }],
    },
    {
      id: "documentos",
      titulo: "Documentos al banco",
      objetivo: "Juntar los documentos completos y mandarlos al banco para su análisis.",
      omitir: contado,
      coach: [
        "Revisa que se lean bien y estén vigentes antes de mandarlos: un documento borroso te cuesta días.",
        "Todavía NO pidas la separación.",
        "Da seguimiento con el banco cada 24 horas y mantén al cliente informado.",
      ],
      campos: [
        { id: "banco", label: "Banco / financiera", type: "select", req: true, opts: ["BBVA", "Banorte", "Santander", "Scotiabank", "HSBC", "Banregio", "Financiera de la marca", "Otro"] },
        { id: "fechaEnvioBanco", label: "Fecha de envío al banco", type: "date", req: true, def: hoy },
        { id: "docINE", label: "INE por ambos lados", type: "check", req: true },
        { id: "docDomicilio", label: "Comprobante de domicilio reciente", type: "check", req: true },
        { id: "docIngresos", label: "Comprobantes de ingresos", type: "check", req: true },
        { id: "docEdoCuenta", label: "Estados de cuenta (si el banco los pide)", type: "check" },
        { id: "docOtros", label: "Otros documentos que pidió el banco", full: true },
        { id: "enviadoBanco", label: "Expediente enviado al banco", type: "check", req: true },
      ],
      acciones: [
        { tipo: "wa", tpl: "documentos", label: "WhatsApp: pedir documentos" },
        { tipo: "wa", tpl: "seguimiento", label: "WhatsApp: ya está en el banco" },
      ],
    },
    {
      id: "aprobacion",
      titulo: "Crédito aprobado",
      objetivo: "Confirmar la aprobación y guardar las condiciones de la cotización aprobada.",
      omitir: contado,
      coach: [
        "El banco desembolsa con base en el enganche y el valor factura de la cotización aprobada. Guárdala.",
        "Condicionado: consigue lo que falte y vuelve a mandar.",
        "Rechazado: prueba otro banco o más enganche antes de perder al cliente.",
        "Con el crédito APROBADO, ahora sí pide la separación.",
      ],
      campos: [
        { id: "estatusCredito", label: "Estatus del crédito", type: "select", req: true, def: "En análisis", opts: ["En análisis", "Condicionado", "Aprobado", "Rechazado"] },
        { id: "fechaAprobacion", label: "Fecha de aprobación", type: "date" },
        { id: "engancheAprobado", label: "Enganche aprobado", type: "money", req: true },
        { id: "montoFinanciado", label: "Monto que presta el banco", type: "money" },
        { id: "plazoMeses", label: "Plazo aprobado (meses)", type: "select", opts: PLAZOS },
        { id: "mensualidad", label: "Mensualidad", type: "money" },
      ],
      validar: function (e) {
        if (e.estatusCredito !== "Aprobado") return "El crédito tiene que estar APROBADO para pedir la separación.";
      },
      acciones: [{ tipo: "wa", tpl: "aprobado", label: "WhatsApp: crédito aprobado y separación" }],
    },
    {
      id: "separacion",
      titulo: "Separación",
      objetivo: "Cobrar la separación de $5,000 y tener el comprobante impreso para caja.",
      coach: [
        "La separación ES parte del enganche, no es un pago extra. Díselo así al cliente.",
        "Gancho: \"Con la separación te aparto la unidad con el interior que te gustó\".",
        "Imprime el comprobante de la transferencia: lo necesitas en caja.",
      ],
      campos: [
        { id: "montoSeparacion", label: "Monto de la separación", type: "money", req: true, def: function () { return String(C.separacion || 5000); } },
        { id: "fechaSeparacion", label: "Fecha de la transferencia", type: "date", req: true, def: hoy },
        { id: "referenciaSeparacion", label: "Referencia / clave de rastreo" },
        { id: "_restante", type: "calc", label: "Enganche que quedará pendiente", fn: function (e) { return contado(e) ? "Contado: se descuenta del pago total" : $$(calc.engancheRestante(e)); } },
        { id: "separacionRecibida", label: "Transferencia recibida y verificada", type: "check", req: true },
        { id: "comprobanteImpreso", label: "Comprobante impreso para caja", type: "check", req: true },
      ],
      acciones: [
        { tipo: "wa", tpl: "aprobado", label: "WhatsApp: pedir separación", show: function (e) { return !contado(e); } },
        { tipo: "wa", tpl: "separacionRecibida", label: "WhatsApp: confirmar separación" },
      ],
    },
    {
      id: "quiter",
      titulo: "Alta en Quiter",
      objetivo: "Dar de alta al cliente y obtener su NÚMERO DE CLIENTE. Aquí no se mete ningún pago.",
      coach: [
        "Ruta: Comercial → Fichas maestras → Cuentas personales.",
        "Primero busca si el cliente ya existe. Si no, créalo desde cero.",
        "Llena en el mismo orden que ves aquí y usa el botón «Copiar» de cada campo.",
        "Portal: déjalo vacío si es un domicilio normal.",
        "Código de cortesía: no se llena.",
      ],
      campos: [
        { id: "_categoria", type: "calc", label: "Categoría", fn: function () { return "P (personal)"; }, copyValue: "P" },
        { id: "nombre", label: "Nombre(s)", req: true, copy: true },
        { id: "apPaterno", label: "Apellido paterno", req: true, copy: true },
        { id: "apMaterno", label: "Apellido materno", copy: true },
        { id: "nombreComercial", label: "Nombre comercial", copy: true, def: function (e) { return nombreCompleto(e); } },
        { id: "calle", label: "Calle y número", req: true, copy: true },
        { id: "portal", label: "Portal", copy: true, hint: "Vacío si es domicilio normal." },
        { id: "cp", label: "Código postal", req: true, copy: true },
        { id: "localidad", label: "Localidad", copy: true },
        { id: "colonia", label: "Colonia", req: true, copy: true },
        { id: "delegacion", label: "Delegación / municipio", req: true, copy: true },
        { id: "estado", label: "Estado", copy: true, def: "Nuevo León" },
        { id: "pais", label: "País", copy: true, def: "México" },
        { id: "fechaNacimiento", label: "Fecha de nacimiento", type: "date", req: true, copy: true },
        { id: "sexo", label: "Sexo", type: "select", copy: true, opts: ["", "Masculino", "Femenino"] },
        { id: "estadoCivil", label: "Estado civil", type: "select", copy: true, opts: ["", "Soltero(a)", "Casado(a)", "Divorciado(a)", "Viudo(a)", "Unión libre"] },
        { id: "idioma", label: "Idioma", copy: true, def: "Español" },
        { id: "tipoIdentificacion", label: "Tipo de identificación", copy: true, def: "INE" },
        { id: "folioINE", label: "Folio de la identificación", req: true, copy: true },
        { id: "curp", label: "CURP", req: true, copy: true, upper: true },
        { id: "rfc", label: "RFC", req: true, copy: true, upper: true },
        { id: "telefono", label: "Teléfono", type: "tel", copy: true },
        { id: "email", label: "Email", type: "email", copy: true },
        { id: "_cortesia", type: "calc", label: "Código de cortesía", fn: function () { return "No se llena"; } },
        { id: "numeroCliente", label: "Número de cliente que generó Quiter", req: true, full: true, hint: "Todos los pagos se aplican con este número." },
      ],
      validar: function (e) {
        if (String(e.curp || "").trim().length !== 18) return "La CURP debe tener 18 caracteres.";
        var r = String(e.rfc || "").trim().length;
        if (r !== 13 && r !== 12) return "El RFC debe tener 13 caracteres (persona física).";
      },
      acciones: [{ tipo: "copiarQuiter", label: "Copiar todos los datos" }],
    },
    {
      id: "caja",
      titulo: "Separación en caja",
      objetivo: "Aplicar la separación en caja con el código de cliente y verificarla en Quiter.",
      coach: [
        "La separación SIEMPRE va al concepto Accesorios.",
        "Entrega el formato y el comprobante impreso a la cajera (la que está atrás de donde están las comidas) y espera tu recibo aplicado.",
        "Monterrey: termina aquí. Piedras Negras: sube con Contabilidad a cancelar el pago, avísale a la cajera y, cuando salga en negativo, manda el correo.",
      ],
      campos: [
        { id: "_formato", type: "calc", label: "Formato de caja", full: true, fn: function (e) {
          return "Concepto: Accesorios · Monto: " + $$(calc.separacion(e)) + " · Total accesorios: " + $$(calc.separacion(e)) +
            " · Código de cliente: " + (e.numeroCliente || "FALTA") + " · Vendedor: " + ((C.asesor || {}).nombre || "");
        } },
        { id: "formatoEntregado", label: "Formato y comprobante entregados a la cajera", type: "check", req: true },
        { id: "folioRecibo", label: "Folio del recibo aplicado" },
        { id: "reciboAplicado", label: "Tengo el recibo aplicado", type: "check", req: true },
        { id: "reflejadoQuiter", label: "El pago ya aparece en la cuenta del cliente en Quiter", type: "check", req: true },
        { id: "pnCancelado", label: "Contabilidad canceló el pago", type: "check", req: true, show: pn },
        { id: "pnAvisoCajera", label: "Le avisé a la cajera que va por Piedras Negras", type: "check", req: true, show: pn },
        { id: "pnNegativo", label: "El pago ya aparece en negativo", type: "check", req: true, show: pn },
        { id: "pnCorreoSeparacion", label: "Correo enviado: pago negativo + aplicación a Accesorios", type: "check", req: true, show: pn },
      ],
      validar: function (e) { if (!e.numeroCliente) return "Primero consigue el número de cliente en el paso «Alta en Quiter»."; },
      acciones: [
        { tipo: "imprimir", que: "separacion", label: "Imprimir formato de caja" },
        { tipo: "correo", que: "separacion", label: "Correo a Piedras Negras", show: pn },
      ],
    },
    {
      id: "firma",
      titulo: "Enganche y firma",
      objetivo: "Cuadrar la venta, cobrar el enganche restante y firmar contrato y factura.",
      coach: [
        "Antes de firmar contesta dos preguntas: ¿qué le vendí? (extras) y ¿qué le di? (bonos).",
        "Lo que vendes aparte (garantía, instalación, kit, llantas, placas) va en una nota separada.",
        "El cliente entrega el enganche MENOS la separación que ya pagó.",
        "No apliques a factura un pago si no sabes a dónde va: cancelarlo tarda 2 o 3 días.",
      ],
      campos: [
        { id: "fechaFirma", label: "Fecha de firma", type: "date", req: true },
        { id: "engancheTotal", label: function (e) { return contado(e) ? "Pago total del cliente (incluye separación)" : "Enganche total (incluye separación)"; }, type: "money", req: true, def: function (e) { return e.engancheAprobado || e.engancheDeseado || ""; } },
        { id: "_engRestante", type: "calc", label: "A entregar el día de la firma", fn: function (e) { return $$(calc.engancheRestante(e)); } },
        { id: "bonosAgencia", label: "Bonos de agencia / marca (¿qué le di?)", type: "money" },
        { id: "bonoFronteraModo", label: "Bono frontera: tipo", type: "select", def: "monto", opts: [["monto", "Monto fijo ($)"], ["pct", "Porcentaje (%)"]], hint: "Pendiente de validar con tu capacitador." },
        { id: "bonoFrontera", label: "Bono frontera", type: "number" },
        { id: "_frontera", type: "calc", label: "Bono frontera en pesos", fn: function (e) { return $$(calc.frontera(e)); } },
      ].concat(EXTRAS.map(function (x) { return { id: x.id, label: x.label + " (¿qué le vendí?)", type: "money" }; })).concat([
        { id: "_nota", type: "calc", label: "Nota separada de extras", fn: function (e) { return $$(calc.extras(e)); } },
        { id: "_esperado", type: "calc", label: "Desembolso esperado del banco", fn: function (e) { return $$(calc.esperado(e)); }, show: function (e) { return !contado(e); } },
        { id: "_totalContado", type: "calc", label: "Total que debe pagar de contado", fn: function (e) { return $$(calc.totalContado(e)); }, show: contado },
        { id: "conceptoEnganche", label: "¿A qué concepto se aplica el enganche?", type: "select", def: "Por confirmar", opts: ["Por confirmar", "Factura", "Accesorios"], hint: "Pendiente de validar con tu capacitador." },
        { id: "engancheRecibido", label: "Enganche recibido", type: "check", req: true },
        { id: "engancheAplicado", label: "Enganche aplicado en caja (recibo en mano)", type: "check", req: true },
        { id: "contratoFirmado", label: "Contrato firmado", type: "check", req: true, show: function (e) { return !contado(e); } },
        { id: "facturaFirmada", label: "Factura firmada", type: "check", req: true },
        { id: "notaFirmada", label: "Nota de extras firmada", type: "check", req: true, show: function (e) { return calc.extras(e) > 0; } },
        { id: "pnCorreoEnganche", label: "Correo a Piedras Negras con la aplicación del enganche", type: "check", req: true, show: pn },
      ]),
      validar: function (e) {
        if (n(e.valorFactura) && calc.enganche(e) + n(e.bonosAgencia) > n(e.valorFactura)) return "Enganche + bonos superan el valor factura. Revisa las cuentas.";
      },
      acciones: [
        { tipo: "wa", tpl: "firma", label: "WhatsApp: agendar firma" },
        { tipo: "imprimir", que: "enganche", label: "Imprimir formato de caja" },
        { tipo: "correo", que: "enganche", label: "Correo a Piedras Negras", show: pn },
      ],
    },
    {
      id: "desembolso",
      titulo: "Desembolso del banco",
      objetivo: "Recibir el desembolso, aplicarlo y demostrar que la unidad quedó en $0.",
      omitir: contado,
      coach: [
        "El banco paga directo a la agencia y manda un archivo de desembolso.",
        "Aplícalo como pago y manda la captura: es la prueba de que la unidad quedó liquidada.",
        "Si el monto real no coincide con el esperado, revisa la cotización aprobada y los bonos.",
      ],
      campos: [
        { id: "_esperado2", type: "calc", label: "Desembolso esperado", fn: function (e) { return $$(calc.esperado(e)); } },
        { id: "desembolsoReal", label: "Desembolso real (del archivo del banco)", type: "money", req: true },
        { id: "_dif", type: "calc", label: "Diferencia contra lo esperado", fn: function (e) { return vacio(e.desembolsoReal) ? "—" : $$(n(e.desembolsoReal) - calc.esperado(e)); },
          tone: function (e) { return vacio(e.desembolsoReal) ? "" : (n(e.desembolsoReal) - calc.esperado(e) < 0 ? "bad" : "ok"); } },
        { id: "fechaDesembolso", label: "Fecha del desembolso", type: "date", req: true },
        { id: "archivoDesembolso", label: "Archivo de desembolso recibido", type: "check", req: true },
        { id: "desembolsoAplicado", label: "Desembolso aplicado como pago", type: "check", req: true },
        { id: "capturaEnviada", label: "Captura enviada a la cuenta (unidad en $0)", type: "check", req: true },
        { id: "pnCorreoDesembolso", label: "Correo a Piedras Negras con la aplicación del desembolso", type: "check", show: pn },
      ],
      acciones: [{ tipo: "correo", que: "desembolso", label: "Correo a Piedras Negras", show: pn }],
    },
    {
      id: "cuadre",
      titulo: "Cuadre sin adeudo",
      objetivo: "Demostrarle a la agencia que el carro está liquidado y que bonos y pagos cubren todos los extras.",
      coach: [
        "Si sobra dinero, no hay problema: queda como saldo a favor y se le devuelve si lo pide.",
        "Si falta, aunque sea $1, el carro no sale. Si es poco, lo pagas en caja, se aplica y listo.",
        "Un pago mal aplicado hace que falte dinero aunque el cliente sí haya pagado.",
      ],
      campos: [
        { id: "_ledger", type: "ledger", full: true },
        { id: "pagoAdicional", label: "Pagos adicionales para liquidar (si faltaba)", type: "money" },
        { id: "_veredicto", type: "calc", full: true, label: "Resultado", fn: function (e) { return veredicto(e).text; }, tone: function (e) { return veredicto(e).tone; } },
        { id: "cuadreRevisado", label: "Cuentas revisadas con la agencia", type: "check", req: true },
      ],
      validar: function (e) { if (calc.saldo(e) < 0) return "Hay adeudo de " + $$(-calc.saldo(e)) + ". El carro no sale hasta liquidarlo."; },
    },
    {
      id: "entrega",
      titulo: "Entrega",
      objetivo: "Entregar la unidad y convertir al cliente en referidos y contenido.",
      coach: [
        "Sin placas: unos 4 días después de la firma y el desembolso, en cuanto la unidad llega a la agencia.",
        "Con placas vendidas: cuando lleguen, o sin ellas si así lo acuerdas con el cliente.",
        "Pide la reseña y referidos en el momento de mayor emoción: la entrega.",
        "Graba el video de la entrega para tu contenido.",
      ],
      campos: [
        { id: "_fechaEst", type: "calc", label: "Entrega estimada", fn: function (e) { return calc.fechaEntrega(e) || "Captura la fecha de firma o de desembolso"; } },
        { id: "placasListas", label: "Llegaron las placas (o acordamos entregar sin ellas)", type: "check", req: true, show: function (e) { return n(e.exPlacas) > 0; } },
        { id: "fechaEntrega", label: "Fecha de entrega", type: "date", req: true },
        { id: "salidaAutorizada", label: "Salida autorizada por la agencia", type: "check", req: true },
        { id: "entregado", label: "Unidad entregada", type: "check", req: true },
        { id: "videoEntrega", label: "Video de la entrega grabado", type: "check" },
        { id: "resenaPedida", label: "Reseña pedida", type: "check" },
        { id: "referidos", label: "Referidos que me dio", type: "textarea", full: true },
      ],
      acciones: [
        { tipo: "wa", tpl: "entrega", label: "WhatsApp: unidad lista" },
        { tipo: "wa", tpl: "resena", label: "WhatsApp: reseña y referidos" },
      ],
    },
  ];

  // ---------- Mensajes de WhatsApp ----------
  var asesor = function () { return (C.asesor || {}).nombre || ""; };
  var PLANTILLAS = {
    cotizacion: function (e) {
      return "Hola " + primerNombre(e) + ", soy " + asesor() + ", tu asesor. Te comparto la cotización del " + (e.modelo || "auto") +
        (e.version ? " " + e.version : "") + (n(e.valorFactura) ? " con valor factura de " + $$(e.valorFactura) : "") + "." +
        (contado(e) ? "" : "\n\nPara revisar tu crédito con el banco necesito:\n• INE por ambos lados\n• Comprobante de domicilio reciente\n• Comprobantes de ingresos\n\nMándamelos por aquí y yo me encargo del trámite.") +
        "\n\n¿Qué color interior te gusta más?";
    },
    documentos: function (e) {
      return "Hola " + primerNombre(e) + ", para meter tu crédito del " + (e.modelo || "auto") + " al banco me faltan:\n" +
        [!e.docINE && "• INE por ambos lados", !e.docDomicilio && "• Comprobante de domicilio reciente", !e.docIngresos && "• Comprobantes de ingresos", e.docOtros && "• " + e.docOtros]
          .filter(Boolean).join("\n") + "\n\nEn cuanto los tenga, los mando.";
    },
    seguimiento: function (e) {
      return "Hola " + primerNombre(e) + ", ya envié tus documentos a " + (e.banco || "el banco") + " para el " + (e.modelo || "auto") + ". En cuanto tenga respuesta te aviso por aquí.";
    },
    aprobado: function (e) {
      return "¡Buenas noticias, " + primerNombre(e) + "! " + (e.banco || "El banco") + " aprobó tu crédito para el " + (e.modelo || "auto") + ".\n\n" +
        "Para apartar tu unidad" + (e.colorInterior ? " con interior " + e.colorInterior : "") + " solo se necesita una separación de " + $$(calc.separacion(e)) +
        ", que se descuenta de tu enganche. ¿Te comparto los datos para la transferencia?";
    },
    separacionRecibida: function (e) {
      return "Listo, " + primerNombre(e) + ", recibí tu separación de " + $$(calc.separacion(e)) + ". Tu " + (e.modelo || "auto") + " ya está apartado" +
        (e.colorInterior ? " con interior " + e.colorInterior : "") + ". Te aviso para agendar la firma.";
    },
    firma: function (e) {
      return "Hola " + primerNombre(e) + ", ya tenemos todo listo para la firma de tu " + (e.modelo || "auto") + ".\n\n" +
        "Ese día firmas " + (contado(e) ? "tu factura" : "contrato y factura") + " y entregas " + $$(calc.engancheRestante(e)) +
        " (ya descontada tu separación de " + $$(calc.separacion(e)) + ")." +
        (e.fechaFirma ? "\n\nTe espero el " + new Date(e.fechaFirma + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }) + ". ¿Te acomoda?" : "\n\n¿Qué día y hora te acomoda?");
    },
    entrega: function (e) {
      return "¡" + primerNombre(e) + ", tu " + (e.modelo || "auto") + " ya está listo! ¿Qué día te acomoda venir por él? Te lo entrego y te explico todas sus funciones.";
    },
    resena: function (e) {
      return "Hola " + primerNombre(e) + ", ¿cómo te ha ido con tu " + (e.modelo || "auto") + "? Me ayudaría mucho una reseña de tu experiencia. Y si conoces a alguien que busque auto, pásale mi número: le doy la misma atención que a ti.";
    },
  };

  // ---------- Correos de Piedras Negras ----------
  function correoPN(e, que) {
    var monto, lineas;
    if (que === "separacion") {
      monto = calc.separacion(e);
      lineas = ["• Accesorios: " + $$(monto)];
    } else if (que === "enganche") {
      monto = calc.engancheRestante(e);
      var concepto = e.conceptoEnganche && e.conceptoEnganche !== "Por confirmar" ? e.conceptoEnganche : "[CONCEPTO POR CONFIRMAR]";
      lineas = ["• " + concepto + ": " + $$(monto)];
    } else {
      monto = calc.desembolso(e);
      lineas = ["• Factura (valor factura): " + $$(monto)];
    }
    var etiqueta = { separacion: "separación", enganche: "enganche", desembolso: "desembolso del banco" }[que];
    var asunto = "Aplicación de pago (" + etiqueta + ") · " + nombreCompleto(e) + " · Cliente " + (e.numeroCliente || "#") + " · Piedras Negras";
    var cuerpo = [
      "Buen día,", "",
      "Les comparto el pago negativo y la aplicación de pago de la siguiente venta por Piedras Negras:", "",
      "Cliente: " + nombreCompleto(e),
      "Número de cliente (Quiter): " + (e.numeroCliente || ""),
      "Unidad: " + [e.modelo, e.version, e.colorExterior].filter(Boolean).join(" · "),
      "Pago: " + etiqueta + " por " + $$(monto),
      e.folioRecibo && que === "separacion" ? "Folio del recibo: " + e.folioRecibo : "",
      "", "Aplicar de la siguiente manera:",
    ].filter(function (x, i, a) { return x !== "" || a[i - 1] !== ""; }).concat(lineas).concat([
      "", "Adjunto el comprobante del pago negativo y el recibo aplicado.", "", "Saludos,", asesor(),
    ]);
    return { para: C.correoPiedrasNegras || "", asunto: asunto, cuerpo: cuerpo.join("\n") };
  }

  // ---------- Formato de caja (impresión) ----------
  function formatoCaja(e, que) {
    var monto = que === "separacion" ? calc.separacion(e) : calc.engancheRestante(e);
    var concepto = que === "separacion" ? "Accesorios" : (e.conceptoEnganche && e.conceptoEnganche !== "Por confirmar" ? e.conceptoEnganche : "________________");
    return {
      titulo: "Aplicación de pago · " + (que === "separacion" ? "Separación" : "Enganche"),
      filas: [
        ["Fecha", new Date().toLocaleDateString("es-MX")],
        ["Código de cliente", e.numeroCliente || "________________"],
        ["Cliente", nombreCompleto(e)],
        ["Unidad", [e.modelo, e.version].filter(Boolean).join(" ")],
        ["Concepto", concepto],
        ["Monto", $$(monto)],
        ["Total " + concepto.toLowerCase(), $$(monto)],
        ["Vendedor", asesor()],
        ["Plaza", pn(e) ? "Piedras Negras (se cancela y se aplica por correo)" : "Monterrey"],
      ],
      nota: "Adjuntar el comprobante de la transferencia impreso.",
    };
  }

  // ---------- Pendientes por validar ----------
  var PENDIENTES = [
    "¿El enganche se aplica en caja igual que la separación? ¿A qué concepto va?",
    "¿Quién recibe el archivo de desembolso del banco y a qué correo se manda la captura?",
    "¿Qué documentos se firman además del contrato y la factura? ¿Qué debe traer el cliente?",
    "¿Quién paga la nota de extras y cómo se aplica?",
    "¿El bono frontera es un monto fijo ($25,000) o un porcentaje (6 %)?",
    "¿A qué correo se mandan las aplicaciones de Piedras Negras?",
    "¿Hay un checklist o formato de salida? ¿Quién autoriza la entrega?",
    "¿Cuánto tardan las placas y quién las tramita?",
    "¿Cómo y cuándo se paga mi comisión? ¿Sube con los extras vendidos?",
  ];

  window.PROCESO = {
    PASOS: PASOS, PLANTILLAS: PLANTILLAS, PENDIENTES: PENDIENTES, EXTRAS: EXTRAS,
    calc: calc, veredicto: veredicto, correoPN: correoPN, formatoCaja: formatoCaja,
    money: $$, n: n, vacio: vacio, nombreCompleto: nombreCompleto,
  };
})();
