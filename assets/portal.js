/*
 * Portal BYD Park Point: inicio de sesión por usuario, ventas con VIN y productos (KPIs),
 * tablero de reporte descargable como imagen, objetivos, corte de piso, CRM, cotizador,
 * academia, guiones y agente.
 *
 * Datos: siempre se guardan en este navegador. Dentro de claude.ai, además se comparten con
 * todo el equipo en la base de datos del portal (cada quien ve lo suyo; dirección ve todo).
 */
(function () {
  var P = window.PORTAL;
  var AC = window.ACADEMIA || { modulos: [], examen: [] };
  var USERS = P.USUARIOS, PROD = P.PRODUCTOS, MODELOS = P.MODELOS;
  var $ = function (id) { return document.getElementById(id); };
  var app = $("app");

  // ---------- Utilidades ----------
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } },
  };
  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else if (k in el && k !== "list" && k !== "form") el[k] = v;
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  function toast(t) {
    var el = $("toast");
    el.textContent = t; el.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove("show"); }, 2400);
  }
  function copiar(text, msg) {
    var ok = function () { toast(msg || "Copiado"); };
    try { navigator.clipboard.writeText(text).then(ok, function () { copiaManual(text, msg); }); }
    catch (e) { copiaManual(text, msg); }
  }
  function copiaManual(text, msg) {
    var ta = h("textarea", { value: text, style: "position:fixed;top:0;opacity:0" });
    document.body.append(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    toast(ok ? (msg || "Copiado") : "No se pudo copiar. Selecciona el texto y cópialo a mano.");
  }
  function waUrl(tel, text) {
    var t = String(tel || "").replace(/\D/g, "");
    if (t.length === 10) t = "52" + t;
    return "https://wa.me/" + t + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  var mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  var mxn2 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function money(n) { return mxn.format(n || 0); }
  function money2(n) { return mxn2.format(n || 0); }
  function pct(n) { return Math.round((n || 0) * 100) + "%"; }
  function hoy() { return new Date().toLocaleDateString("en-CA", { timeZone: "America/Monterrey" }); }
  function horaMty() { return new Date().toLocaleTimeString("es-MX", { timeZone: "America/Monterrey", hour: "2-digit", minute: "2-digit", hour12: false }); }
  function mesDe(f) { return String(f || "").slice(0, 7); }
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function nombreMes(m) { var p = String(m).split("-"); return MESES[Number(p[1]) - 1] + " " + p[0]; }
  function Mayus(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function fechaCorta(f) { if (!f) return ""; var p = f.split("-"); return Number(p[2]) + " " + MESES[Number(p[1]) - 1].slice(0, 3); }
  function fechaLarga(f) {
    var d = new Date(f + "T12:00:00");
    return Mayus(d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
  }
  function diasDelMes(m) { var p = m.split("-"); return new Date(Number(p[0]), Number(p[1]), 0).getDate(); }
  function nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clonar(o) { return JSON.parse(JSON.stringify(o)); }
  function iniciales(u) { return u.rol === "ceo" ? "CEO" : u.completo.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase(); }
  function userById(id) { return USERS.filter(function (u) { return u.id === id; })[0]; }
  function modeloById(id) { return MODELOS.filter(function (m) { return m.id === id; })[0]; }
  function nombreModelo(id) { var m = modeloById(id); return m ? m.nombre + " " + m.anio : (id || "Sin modelo"); }
  function colorHex(c) { var x = P.COLORES.filter(function (k) { return k.id === c; })[0]; return x ? x.hex : "#9aa0a8"; }
  var VENDEDORES = USERS.filter(function (u) { return u.vende; });

  // ---------- Íconos ----------
  var IC = {
    inicio: '<path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    ventas: '<path d="M5 16l1.6-5.2A2 2 0 0 1 8.5 9.4h7a2 2 0 0 1 1.9 1.4L19 16"/><path d="M4 16h16v3H4z"/><circle cx="8" cy="19" r="1"/><circle cx="16" cy="19" r="1"/>',
    reporte: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5"/><path d="M12 16V8"/><path d="M16 16v-3"/>',
    objetivos: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
    piso: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>',
    crm: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',
    cotizador: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h2M12 11h2M8 15h2M12 15h2M8 18h2M12 18h2M16 11v7"/>',
    guiones: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    agente: '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z"/>',
    academia: '<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4"/>',
    equipo: '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.7.2 5 1.9 5 4.8"/>',
    herramientas: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5L16 12l-4-4z"/>',
    salir: '<path d="M10 5H5v14h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/>',
    descargar: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
  };
  function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[name] + "</svg>"; }
  function btn(texto, onclick, cls, ic) {
    var b = h("button", { type: "button", class: "btn " + (cls || ""), onclick: onclick });
    if (ic) b.innerHTML = icon(ic);
    b.append(texto);
    return b;
  }

  // ---------- Datos ----------
  var COLS = ["ventas", "leads", "cortes", "config", "academia"];
  var KEY = "parkpoint.datos.v1";
  var D = LS.get(KEY, null) || {};
  COLS.forEach(function (c) { if (!D[c]) D[c] = {}; });
  var nube = { db: null, estado: "local", listo: !(window.claude && typeof window.claude.use === "function"), cargadas: {}, conocidos: {}, ultimo: {}, pend: {}, cadena: {}, soloLectura: false };
  COLS.forEach(function (c) { nube.conocidos[c] = {}; });

  function guardarLocal() { LS.set(KEY, D); }
  function lista(col) { return Object.keys(D[col]).map(function (k) { return D[col][k]; }); }
  function put(col, id, doc, espera) {
    doc.id = id; doc.actualizado = Date.now();
    D[col][id] = doc; guardarLocal();
    programar(col, id, espera);
  }
  function quitar(col, id) {
    delete D[col][id]; guardarLocal();
    if (!nube.db) return;
    var k = col + "/" + id;
    clearTimeout(nube.pend[k]); nube.pend[k] = true;
    nube.cadena[k] = (nube.cadena[k] || Promise.resolve()).then(function () { return nube.db.collection(col).doc(id).delete(); })
      .catch(function () { marcarError(); })
      .then(function () { delete nube.pend[k]; delete nube.conocidos[col][id]; delete nube.ultimo[k]; });
  }
  function programar(col, id, espera) {
    if (!nube.db) return;
    var k = col + "/" + id;
    clearTimeout(nube.pend[k]);
    nube.pend[k] = setTimeout(function () { escribir(col, id); }, espera == null ? 600 : espera);
  }
  function escribir(col, id) {
    var k = col + "/" + id, doc = D[col][id];
    if (!doc) { delete nube.pend[k]; return; }
    var json = JSON.stringify(doc);
    if (json === nube.ultimo[k]) { delete nube.pend[k]; return; }
    nube.cadena[k] = (nube.cadena[k] || Promise.resolve()).then(function () {
      return nube.db.collection(col).doc(id).set(JSON.parse(json));
    }).then(function () {
      nube.ultimo[k] = json; nube.conocidos[col][id] = true;
      if (nube.estado !== "nube") { nube.estado = "nube"; pintarSync(); }
    }, function (err) {
      var code = err && err.code;
      if (code === "invalid_argument" && !nube.soloLectura) { nube.soloLectura = true; toast("Tu acceso a este portal es de solo lectura. Pide acceso de colaborador."); }
      else if (code === "quota_exceeded") toast("La base de datos del portal está llena. Borra registros viejos.");
      marcarError();
    }).then(function () { delete nube.pend[k]; });
  }
  function marcarError() { nube.estado = "error"; pintarSync(); }
  function pintarSync() {
    var el = $("syncState");
    if (!el) return;
    el.className = "sync " + nube.estado;
    el.textContent = { local: "Guardado en este dispositivo", nube: "Sincronizado con el equipo", error: "Sin conexión con el equipo · guardado aquí" }[nube.estado];
  }
  function iniciarNube() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    var timeout = setTimeout(function () { if (!nube.listo) { nube.listo = true; renderLogin(); } }, 8000);
    window.claude.use("db").then(function (db) {
      if (!db) { nube.listo = true; clearTimeout(timeout); renderLogin(); return; }
      nube.db = db;
      window.claude.use("user").then(function (u) {
        if (!u) return;
        u.can("data.write").then(function (v) { if (v === false) nube.soloLectura = true; }, function () {});
      });
      COLS.forEach(function (col) { escuchar(col, timeout); });
    }, function () { nube.listo = true; clearTimeout(timeout); renderLogin(); });
  }
  function escuchar(col, timeout) {
    var primero = true;
    nube.db.collection(col).onSnapshot(function (snap) {
      var server = {}, cambio = false;
      snap.docs.forEach(function (d) { if (d.exists) server[d.id] = d.data(); });
      Object.keys(server).forEach(function (id) {
        var s = server[id], loc = D[col][id], k = col + "/" + id;
        nube.conocidos[col][id] = true;
        if (!loc || ((s.actualizado || 0) > (loc.actualizado || 0) && !nube.pend[k])) { D[col][id] = clonar(s); cambio = true; }
        if ((D[col][id].actualizado || 0) === (s.actualizado || 0)) nube.ultimo[k] = JSON.stringify(D[col][id]);
      });
      Object.keys(D[col]).forEach(function (id) {
        if (server[id] || nube.pend[col + "/" + id]) return;
        if (primero) programar(col, id, 0);
        else if (nube.conocidos[col][id]) { delete D[col][id]; delete nube.conocidos[col][id]; cambio = true; }
      });
      if (primero) {
        primero = false; nube.cargadas[col] = true;
        if (COLS.every(function (c) { return nube.cargadas[c]; })) {
          clearTimeout(timeout);
          nube.estado = "nube"; pintarSync();
          if (!nube.listo) { nube.listo = true; if (!sesion) renderLogin(); }
        }
      }
      if (cambio) { guardarLocal(); alCambiarRemoto(col); }
    }, function () { marcarError(); });
  }

  // ---------- Objetivos (por mes) ----------
  function objetivos(mes) {
    var o = D.config["obj-" + mes] || {};
    var metas = {}, prods = {};
    VENDEDORES.forEach(function (u) { metas[u.id] = (o.metas && o.metas[u.id] != null) ? o.metas[u.id] : P.metaUnidades; });
    PROD.forEach(function (p) { prods[p.id] = (o.productos && o.productos[p.id] != null) ? o.productos[p.id] : P.metaProducto; });
    return { metas: metas, productos: prods, guardado: !!D.config["obj-" + mes] };
  }

  // ---------- Sesión ----------
  var sesion = null;
  var SKEY = "parkpoint.sesion";
  function yo() { return sesion && userById(sesion.uid); }
  function esDireccion(u) { u = u || yo(); return !!u && (u.rol === "ceo" || u.rol === "gerente"); }
  function puedeVer(asesorId) { return esDireccion() || asesorId === yo().id; }
  function pins() { return (D.config.pins && D.config.pins.lista) || {}; }
  function hashPin(uid, pin) {
    var txt = "parkpoint:" + uid + ":" + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
    }
    var x = 5381; for (var i = 0; i < txt.length; i++) x = ((x << 5) + x + txt.charCodeAt(i)) | 0;
    return Promise.resolve("d" + (x >>> 0).toString(16));
  }
  function guardarPin(uid, hash) {
    var doc = clonar(D.config.pins || { lista: {} });
    if (hash) doc.lista[uid] = hash; else delete doc.lista[uid];
    put("config", "pins", doc, 0);
  }

  var login = { paso: "quien", uid: null, pin: "", primero: "", error: "" };
  function renderLogin() {
    if (sesion) return;
    var box = $("login");
    box.hidden = false; $("shell").hidden = true;
    box.innerHTML = "";
    var wrap = h("div", { class: "login-box" });
    box.append(wrap);
    wrap.append(h("div", { class: "brand-xl" }, h("b", { text: "PARK POINT" }), h("span", { text: P.agencia + " · " + P.grupo })));

    if (!nube.listo) {
      wrap.append(h("p", { class: "sub", text: "Conectando con los datos del equipo…" }));
      return;
    }
    if (login.paso === "quien") {
      wrap.append(
        h("div", null, h("h1", { text: "¿Quién eres?" }), h("p", { class: "sub", text: "Elige tu usuario para entrar a tu sesión." })),
        h("div", { class: "who" }, USERS.map(function (u) {
          return h("button", { type: "button", onclick: function () { login = { paso: "pin", uid: u.id, pin: "", primero: "", error: "" }; renderLogin(); } },
            h("span", { class: "avatar" + (u.rol !== "asesor" ? " boss" : ""), text: iniciales(u), "data-n": String(iniciales(u).length) }),
            h("span", null, h("strong", { text: u.completo === "Dirección general" ? "CEO" : u.completo }), h("small", { text: P.ROLES[u.rol] + (u.rol === "gerente" ? " · también vende" : "") })));
        }))
      );
      return;
    }
    var u = userById(login.uid);
    var tiene = !!pins()[u.id];
    var titulo = tiene ? "Escribe tu PIN" : (login.primero ? "Confirma tu PIN" : "Crea tu PIN de 4 dígitos");
    var dots = h("div", { class: "pin-dots", "aria-hidden": "true" });
    for (var i = 0; i < 4; i++) dots.append(h("i", { class: i < login.pin.length ? "on" : "" }));
    var pad = h("div", { class: "pinpad" });
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "OK"].forEach(function (k) {
      pad.append(h("button", { type: "button", text: k, "aria-label": k === "←" ? "Borrar" : k === "OK" ? "Entrar" : k, onclick: function () { tecla(k); } }));
    });
    wrap.append(h("div", { class: "pinbox" },
      h("div", { class: "row" }, h("span", { class: "avatar" + (u.rol !== "asesor" ? " boss" : ""), text: iniciales(u), "data-n": String(iniciales(u).length) }),
        h("div", { style: "flex:1;min-width:0" }, h("strong", { text: u.rol === "ceo" ? "CEO" : u.completo }), h("div", { class: "hint", text: P.ROLES[u.rol] })),
        h("button", { type: "button", class: "btn line sm", text: "Cambiar", onclick: function () { login = { paso: "quien" }; renderLogin(); } })),
      h("h2", { text: titulo, style: "text-align:center" }),
      !tiene ? h("p", { class: "hint", style: "text-align:center;margin:0", text: "Es tu primera vez. Este PIN separa tu sesión de la de los demás." }) : null,
      dots,
      h("p", { class: "pin-err", text: login.error || "" }),
      pad
    ));
  }
  function tecla(k) {
    if (k === "←") { login.pin = login.pin.slice(0, -1); login.error = ""; renderLogin(); return; }
    if (k === "OK") { if (login.pin.length === 4) validarPin(); return; }
    if (login.pin.length >= 4) return;
    login.pin += k; login.error = "";
    renderLogin();
    if (login.pin.length === 4) setTimeout(validarPin, 120);
  }
  document.addEventListener("keydown", function (e) {
    if (sesion || login.paso !== "pin" || $("dlg").open) return;
    if (/^[0-9]$/.test(e.key)) tecla(e.key);
    else if (e.key === "Backspace") tecla("←");
    else if (e.key === "Enter") tecla("OK");
  });
  function validarPin() {
    var u = userById(login.uid), pin = login.pin;
    var guardado = pins()[u.id];
    if (!guardado && !login.primero) { login.primero = pin; login.pin = ""; renderLogin(); return; }
    if (!guardado && login.primero !== pin) { login.primero = ""; login.pin = ""; login.error = "No coinciden. Créalo de nuevo."; renderLogin(); return; }
    if (nube.soloLectura && !guardado) { login.pin = ""; login.error = "Tu acceso es de solo lectura; pide acceso de colaborador."; renderLogin(); return; }
    hashPin(u.id, pin).then(function (hs) {
      if (!guardado) { guardarPin(u.id, hs); entrar(u, true); return; }
      if (hs === guardado) entrar(u, false);
      else { login.pin = ""; login.error = "PIN incorrecto. Intenta otra vez."; renderLogin(); }
    });
  }
  function entrar(u, nuevo) {
    var box = $("login");
    box.innerHTML = "";
    box.append(h("div", { class: "welcome" },
      h("span", { class: "avatar" + (u.rol !== "asesor" ? " boss" : ""), text: iniciales(u), "data-n": String(iniciales(u).length) }),
      h("p", { class: "eyebrow", text: nuevo ? "PIN creado" : "Bienvenido" }),
      h("h1", { text: "Eres " + (u.rol === "ceo" ? "el CEO" : u.completo) }),
      h("p", { class: "sub", text: P.ROLES[u.rol] + " · " + P.agencia })
    ));
    sesion = { uid: u.id, desde: Date.now() };
    LS.set(SKEY, sesion);
    setTimeout(function () { abrirShell(); }, 1100);
  }
  function salir() {
    sesion = null; LS.del(SKEY);
    login = { paso: "quien", uid: null, pin: "", primero: "", error: "" };
    document.body.classList.remove("menu");
    renderLogin();
  }

  // ---------- Navegación ----------
  var NAV = [
    { grp: "Operación" },
    { id: "inicio", t: "Inicio", ic: "inicio" },
    { id: "ventas", t: "Ventas", ic: "ventas" },
    { id: "reporte", t: "Tablero de reporte", ic: "reporte" },
    { id: "objetivos", t: "Objetivos", ic: "objetivos" },
    { id: "piso", t: "Corte de piso", ic: "piso" },
    { grp: "Vender" },
    { id: "crm", t: "Prospectos (CRM)", ic: "crm" },
    { id: "cotizador", t: "Cotizador", ic: "cotizador" },
    { id: "guiones", t: "Guiones", ic: "guiones" },
    { id: "agente", t: "Agente IA", ic: "agente" },
    { grp: "Equipo" },
    { id: "academia", t: "Academia BYD", ic: "academia" },
    { id: "equipo", t: "Equipo", ic: "equipo", dir: true },
    { id: "herramientas", t: "Herramientas", ic: "herramientas" },
  ];
  // Qué colecciones afectan a cada vista (para refrescar cuando otro usuario cambia algo).
  var DEPENDE = { inicio: "ventas leads cortes config", ventas: "ventas", reporte: "ventas config", objetivos: "ventas config", piso: "cortes", crm: "leads", academia: "academia", equipo: "ventas cortes config academia", herramientas: "" };
  var ruta = "inicio", sub = null;
  function go(r, s) {
    ruta = r; sub = s || null;
    document.body.classList.remove("menu");
    window.scrollTo(0, 0);
    render();
  }
  function abrirShell() {
    $("login").hidden = true; $("shell").hidden = false;
    var u = yo();
    filtros = { mes: hoy().slice(0, 7), asesor: esDireccion(u) ? "todos" : u.id, q: "" };
    crmAsesor = "todos"; pisoFecha = null; chat = { hist: [], ocupado: false, error: "" };
    var me = $("me"); me.innerHTML = "";
    me.append(h("span", { class: "avatar" + (u.rol !== "asesor" ? " boss" : ""), text: iniciales(u), "data-n": String(iniciales(u).length) }),
      h("div", null, h("strong", { text: u.rol === "ceo" ? "CEO" : u.completo }), h("small", { text: P.ROLES[u.rol] })));
    var out = h("button", { type: "button", class: "iconbtn", title: "Cerrar sesión", "aria-label": "Cerrar sesión", onclick: salir });
    out.innerHTML = icon("salir");
    me.append(out);
    $("mtopUser").innerHTML = "";
    $("mtopUser").append(u.rol === "ceo" ? "CEO" : u.nombre, h("br"), P.ROLES[u.rol]);
    go("inicio");
  }
  function pintarNav() {
    var nav = $("nav"); nav.innerHTML = "";
    NAV.forEach(function (n) {
      if (n.grp) { nav.append(h("div", { class: "grp", text: n.grp })); return; }
      if (n.dir && !esDireccion()) return;
      var b = h("button", { type: "button", onclick: function () { go(n.id); } });
      b.innerHTML = icon(n.ic);
      b.append(n.t);
      if (ruta === n.id) b.setAttribute("aria-current", "page");
      nav.append(b);
    });
  }
  $("menuBtn").addEventListener("click", function () { document.body.classList.add("menu"); });
  $("scrim").addEventListener("click", function () { document.body.classList.remove("menu"); });

  function render() {
    if (!sesion) return;
    pintarNav();
    app.innerHTML = "";
    var vistas = { inicio: vInicio, ventas: vVentas, reporte: vReporte, objetivos: vObjetivos, piso: vPiso, crm: vCrm, cotizador: vCotizador, guiones: vGuiones, agente: vAgente, academia: vAcademia, equipo: vEquipo, herramientas: vHerramientas };
    if (ruta === "equipo" && !esDireccion()) ruta = "inicio";
    var page = h("div", { class: "page" });
    app.append(page);
    (vistas[ruta] || vInicio)(page);
    pintarSync();
  }
  function alCambiarRemoto(col) {
    if (!sesion) { if (col === "config") renderLogin(); return; }
    if ($("dlg").open) { pendienteRender = true; return; }
    var dep = DEPENDE[ruta];
    if (dep && dep.indexOf(col) >= 0) render();
  }
  var pendienteRender = false;
  $("dlg").addEventListener("close", function () { if (pendienteRender) { pendienteRender = false; render(); } });

  function cabecera(eyebrow, titulo, texto, extra) {
    return h("div", { class: "page-head" },
      h("div", null, h("p", { class: "eyebrow", text: eyebrow }), h("h1", { text: titulo }), texto ? h("p", { class: "sub", text: texto }) : null),
      extra ? h("div", { class: "row" }, extra) : null);
  }
  function tile(k, v, nota, cls) {
    return h("div", { class: "tile" }, h("span", { class: "k", text: k }), h("span", { class: "num " + (cls || ""), text: v }), nota ? h("small", { text: nota }) : null);
  }
  function selMes(valor, onchange) {
    return h("input", { type: "month", id: "selMes", value: valor, "aria-label": "Mes", style: "width:auto", onchange: function (e) { if (e.target.value) onchange(e.target.value); } });
  }
  function segAsesor(valor, onchange, conTodos) {
    var s = h("div", { class: "seg", role: "group", "aria-label": "Vendedor" });
    var ops = (conTodos !== false ? [{ id: "todos", nombre: "Equipo" }] : []).concat(VENDEDORES);
    ops.forEach(function (o) { s.append(h("button", { type: "button", text: o.nombre, "aria-pressed": String(valor === o.id), onclick: function () { onchange(o.id); } })); });
    return s;
  }
  function barRow(label, valor, max, texto, meta, swatch) {
    var w = max > 0 ? Math.min(valor / max, 1) * 100 : 0;
    var track = h("div", { class: "track" }, w > 0 ? h("i", { style: "width:" + w + "%" }) : null);
    if (meta != null && max > 0) track.append(h("b", { style: "left:calc(" + Math.min(meta / max, 1) * 100 + "% - 1px)", title: "Meta" }));
    return h("div", { class: "bar-row", title: label + ": " + texto },
      h("span", { class: "lbl" }, swatch ? h("span", { class: "swatch", style: "background:" + swatch }) : null, h("span", { class: "ell", text: label })),
      track, h("span", { class: "val", html: texto }));
  }

  // ---------- Cálculos de ventas ----------
  var filtros = { mes: hoy().slice(0, 7), asesor: "todos", q: "" };
  function ventasMes(mes, asesor) {
    return lista("ventas").filter(function (v) {
      if (v.estatus === "Cancelada") return false;
      if (mesDe(v.fecha) !== mes) return false;
      if (asesor && asesor !== "todos" && v.asesor !== asesor) return false;
      return puedeVer(v.asesor);
    });
  }
  function resumen(vs) {
    var r = { n: vs.length, prod: {}, totalProd: 0, modelos: {}, colores: {}, asesores: {}, entregadas: 0 };
    PROD.forEach(function (p) { r.prod[p.id] = 0; });
    VENDEDORES.forEach(function (u) { r.asesores[u.id] = { n: 0, prod: 0 }; });
    vs.forEach(function (v) {
      var c = 0;
      PROD.forEach(function (p) { if (v.productos && v.productos[p.id]) { r.prod[p.id]++; c++; } });
      r.totalProd += c;
      r.modelos[v.modelo] = (r.modelos[v.modelo] || 0) + 1;
      var col = v.color || "Sin color";
      r.colores[col] = (r.colores[col] || 0) + 1;
      if (!r.asesores[v.asesor]) r.asesores[v.asesor] = { n: 0, prod: 0 };
      r.asesores[v.asesor].n++; r.asesores[v.asesor].prod += c;
      if (v.estatus === "Entregada") r.entregadas++;
    });
    r.porUnidad = r.n ? r.totalProd / r.n : 0;
    return r;
  }
  function ordenar(obj) { return Object.keys(obj).map(function (k) { return { k: k, n: obj[k] }; }).sort(function (a, b) { return b.n - a.n; }); }
  function contarProd(v) { return PROD.filter(function (p) { return v.productos && v.productos[p.id]; }).length; }
  function metaDe(mes, asesor) {
    var o = objetivos(mes);
    if (asesor && asesor !== "todos") return o.metas[asesor] || 0;
    return VENDEDORES.reduce(function (s, u) { return s + (o.metas[u.id] || 0); }, 0);
  }

  // ---------- Inicio ----------
  function vInicio(page) {
    var u = yo(), mes = hoy().slice(0, 7);
    var dir = esDireccion();
    page.append(h("div", { class: "page-head" },
      h("div", null,
        h("p", { class: "eyebrow", text: P.agencia + " · " + fechaLarga(hoy()) }),
        h("h1", { text: "Hola, " + (u.rol === "ceo" ? "CEO" : u.nombre) }),
        h("p", { class: "sub", text: "Sesión de " + (u.rol === "ceo" ? "Dirección general" : u.completo) + " · " + P.ROLES[u.rol] + (u.rol === "gerente" ? " (también registras tus ventas)" : "") + "." }))));

    var acciones = h("div", { class: "row" });
    if (u.vende || dir) acciones.append(btn("Registrar venta", function () { dlgVenta(null); }, "", "mas"));
    if (u.vende) acciones.append(btn("Capturar corte", function () { go("piso"); }, "line"));
    acciones.append(btn("Ver tablero", function () { go("reporte"); }, "line"), btn("Cotizar", function () { go("cotizador"); }, "line"));
    page.append(acciones);

    if (u.vende) {
      var mias = resumen(ventasMes(mes, u.id));
      var meta = metaDe(mes, u.id);
      var dLeft = diasDelMes(mes) - Number(hoy().slice(8, 10));
      var faltan = Math.max(meta - mias.n, 0);
      page.append(h("div", { class: "tiles" },
        tile("Mis unidades de " + MESES[Number(mes.slice(5)) - 1], String(mias.n), "Meta: " + meta),
        tile("Faltan para la meta", String(faltan), faltan ? dLeft + " días restantes" : "Meta cumplida"),
        tile("Ritmo necesario", faltan ? (faltan / Math.max(dLeft / 7, 1 / 7)).toFixed(1) : "0", "unidades por semana"),
        tile("Productos por unidad", mias.porUnidad.toFixed(1), mias.totalProd + " productos vendidos")));
      var card = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Tu avance del mes" }), h("span", { class: "pill " + (mias.n >= meta ? "ok" : "acc"), text: pct(meta ? mias.n / meta : 0) + " de la meta" })));
      var bars = h("div", { class: "bars" });
      bars.append(barRow("Unidades", mias.n, Math.max(meta, mias.n, 1), mias.n + " <small>/ " + meta + "</small>", meta));
      var objs = objetivos(mes);
      PROD.forEach(function (p) {
        var pc = mias.n ? mias.prod[p.id] / mias.n : 0;
        bars.append(barRow(p.label, pc, 1, pct(pc) + " <small>" + mias.prod[p.id] + "</small>", objs.productos[p.id] / 100));
      });
      card.append(bars, leyendaMeta());
      page.append(card);
    }

    if (dir) {
      var eq = resumen(ventasMes(mes, "todos"));
      var metaEq = metaDe(mes, "todos");
      var cortesHoy = VENDEDORES.filter(function (v) { return D.cortes[hoy() + "_" + v.id]; }).length;
      page.append(h("div", { class: "tiles" },
        tile("Unidades del equipo", String(eq.n), "Meta del equipo: " + metaEq),
        tile("Cumplimiento", pct(metaEq ? eq.n / metaEq : 0), nombreMes(mes)),
        tile("Productos por unidad", eq.porUnidad.toFixed(1), eq.totalProd + " productos"),
        tile("Cortes de hoy", cortesHoy + "/" + VENDEDORES.length, "vendedores con corte capturado")));
      page.append(rankingCard(mes, eq));
    }

    var grid = h("div", { class: "grid2" });
    if (u.vende) {
      var due = lista("leads").filter(function (l) { return l.asesor === u.id && l.fechaSig && l.fechaSig <= hoy() && l.etapa !== "entregado" && l.etapa !== "referidor"; })
        .sort(function (a, b) { return a.fechaSig < b.fechaSig ? -1 : 1; });
      var c1 = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Seguimientos para hoy" }), btn("Abrir CRM", function () { go("crm"); }, "line sm")));
      if (!due.length) c1.append(h("p", { class: "muted", style: "margin:0", text: "No tienes seguimientos vencidos. Agenda el siguiente contacto de cada prospecto en el CRM." }));
      due.slice(0, 6).forEach(function (l) {
        c1.append(h("div", { class: "row", style: "padding:8px 0;border-top:1px solid var(--line)" },
          h("div", { style: "flex:1;min-width:0" }, h("strong", { text: l.nombre }), h("div", { class: "hint", text: (l.siguiente || "Sin acción definida") + " · " + nombreModelo(l.modelo) })),
          h("span", { class: "pill warn", text: l.fechaSig === hoy() ? "Hoy" : fechaCorta(l.fechaSig) })));
      });
      grid.append(c1);
    }
    var recientes = lista("ventas").filter(function (v) { return puedeVer(v.asesor); }).sort(function (a, b) { return (b.fecha + b.creado) > (a.fecha + a.creado) ? 1 : -1; }).slice(0, 6);
    var c2 = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: dir ? "Últimas ventas del equipo" : "Tus últimas ventas" }), btn("Ver todas", function () { go("ventas"); }, "line sm")));
    if (!recientes.length) c2.append(h("p", { class: "muted", style: "margin:0", text: "Todavía no hay ventas registradas. Usa “Registrar venta” con VIN, número de cliente, modelo, color y productos." }));
    recientes.forEach(function (v) {
      c2.append(h("div", { class: "row", style: "padding:8px 0;border-top:1px solid var(--line)" },
        h("span", { class: "swatch", style: "background:" + colorHex(v.color) }),
        h("div", { style: "flex:1;min-width:0" }, h("strong", { text: v.cliente }), h("div", { class: "hint", text: nombreModelo(v.modelo) + " · " + (v.color || "") + (dir ? " · " + (userById(v.asesor) || {}).nombre : "") })),
        h("span", { class: "pill acc", text: contarProd(v) + " prod." })));
    });
    grid.append(c2);
    page.append(grid);
  }
  function leyendaMeta() {
    return h("div", { class: "legend" }, h("span", null, h("i"), "Real"), h("span", null, h("b"), "Meta"));
  }
  function rankingCard(mes, eq) {
    var o = objetivos(mes);
    var card = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Ranking de vendedores · " + nombreMes(mes) })));
    var max = Math.max.apply(null, VENDEDORES.map(function (u) { return Math.max(o.metas[u.id], eq.asesores[u.id].n); }).concat([1]));
    var bars = h("div", { class: "bars" });
    VENDEDORES.slice().sort(function (a, b) { return eq.asesores[b.id].n - eq.asesores[a.id].n; }).forEach(function (u) {
      var a = eq.asesores[u.id];
      bars.append(barRow(u.completo, a.n, max, a.n + " <small>/ " + o.metas[u.id] + "</small>", o.metas[u.id]));
    });
    card.append(bars, leyendaMeta());
    return card;
  }

  // ---------- Ventas ----------
  function vVentas(page) {
    var dir = esDireccion();
    var extra = [];
    if (yo().vende || dir) extra.push(btn("Registrar venta", function () { dlgVenta(null); }, "", "mas"));
    page.append(cabecera("Operación", "Ventas", dir ? "Todas las unidades del equipo con VIN, número de cliente, modelo, color y productos vendidos." : "Tus unidades con VIN, número de cliente, modelo, color y productos vendidos.", extra));
    var bar = h("div", { class: "row" }, selMes(filtros.mes, function (m) { filtros.mes = m; render(); }));
    if (dir) bar.append(segAsesor(filtros.asesor, function (a) { filtros.asesor = a; render(); }));
    var q = h("input", { type: "text", id: "buscarVenta", placeholder: "Buscar cliente, VIN o número de cliente", value: filtros.q, style: "max-width:320px", oninput: function () { filtros.q = q.value; pintar(); } });
    bar.append(h("span", { class: "spacer" }), q);
    page.append(bar);
    var holder = h("div");
    page.append(holder);
    function pintar() {
      holder.innerHTML = "";
      var qq = filtros.q.trim().toLowerCase();
      var vs = lista("ventas").filter(function (v) {
        if (!puedeVer(v.asesor) || mesDe(v.fecha) !== filtros.mes) return false;
        if (dir && filtros.asesor !== "todos" && v.asesor !== filtros.asesor) return false;
        if (qq && [v.cliente, v.vin, v.numCliente].join(" ").toLowerCase().indexOf(qq) < 0) return false;
        return true;
      }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.creado || 0) - (a.creado || 0); });
      if (!vs.length) {
        holder.append(h("div", { class: "empty" }, h("strong", { text: "Sin ventas en " + nombreMes(filtros.mes) + (qq ? " con esa búsqueda" : "") }),
          h("span", { text: "Cada venta guarda VIN, número de cliente, modelo, color y los productos que vendiste." }),
          (yo().vende || dir) ? btn("Registrar venta", function () { dlgVenta(null); }, "", "mas") : null));
        return;
      }
      holder.append(h("div", { class: "card", style: "padding:6px 8px" }, tablaVentas(vs, true)));
    }
    pintar();
  }
  function tablaVentas(vs, editable) {
    var dir = esDireccion();
    var t = h("table", { class: "t" });
    t.append(h("thead", null, h("tr", null,
      h("th", { text: "Fecha" }), h("th", { text: "Cliente" }), h("th", { text: "VIN" }), h("th", { text: "Modelo" }), h("th", { text: "Color" }),
      dir ? h("th", { text: "Vendedor" }) : null, h("th", { text: "Productos" }), h("th", { text: "Estatus" }))));
    var tb = h("tbody");
    vs.forEach(function (v) {
      var dots = h("span", { class: "kpidots", title: PROD.filter(function (p) { return v.productos && v.productos[p.id]; }).map(function (p) { return p.label; }).join(", ") || "Sin productos" });
      PROD.forEach(function (p) { dots.append(h("i", { class: v.productos && v.productos[p.id] ? "on" : "" })); });
      var est = { Apartada: "warn", Facturada: "acc", Entregada: "ok", Cancelada: "bad" }[v.estatus] || "";
      tb.append(h("tr", { class: editable ? "click" : "", onclick: editable ? function () { dlgVenta(v); } : null },
        h("td", { text: fechaCorta(v.fecha) }),
        h("td", null, h("strong", { text: v.cliente }), v.numCliente ? h("div", { class: "hint", text: "Cliente " + v.numCliente }) : null),
        h("td", { class: "mono", text: v.vin || "—" }),
        h("td", { text: nombreModelo(v.modelo) }),
        h("td", null, h("span", { class: "row", style: "gap:6px;flex-wrap:nowrap" }, h("span", { class: "swatch", style: "background:" + colorHex(v.color) }), v.color || "—"), v.colorNombre ? h("div", { class: "hint", text: v.colorNombre }) : null),
        dir ? h("td", { text: (userById(v.asesor) || {}).nombre || v.asesor }) : null,
        h("td", null, h("span", { class: "row", style: "gap:8px;flex-wrap:nowrap" }, dots, h("span", { class: "hint", text: contarProd(v) + "/" + PROD.length }))),
        h("td", null, h("span", { class: "pill " + est, text: v.estatus || "—" }))));
    });
    t.append(tb);
    return h("div", { class: "tablewrap" }, t);
  }

  // ---------- Diálogo genérico ----------
  function abrirDlg(titulo, body, foot) {
    var f = $("dlgForm"); f.innerHTML = "";
    var close = h("button", { type: "button", class: "iconbtn", "aria-label": "Cerrar", onclick: function () { $("dlg").close(); } });
    close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    f.append(h("div", { class: "dlg-head" }, h("h2", { text: titulo }), close), h("div", { class: "dlg-body" }, body));
    if (foot) f.append(h("div", { class: "dlg-foot" }, foot));
    if (!$("dlg").open) $("dlg").showModal();
  }
  function confirmar(titulo, texto, boton, fn) {
    abrirDlg(titulo, h("p", { class: "muted", style: "margin:0", text: texto }),
      [btn(boton, function () { $("dlg").close(); fn(); }, "danger"), btn("Cancelar", function () { $("dlg").close(); }, "line")]);
  }
  function campo(label, input, opts) {
    opts = opts || {};
    return h("div", { class: "f" + (opts.full ? " full" : ""), id: opts.id ? "f-" + opts.id : null },
      h("label", { for: input.id || null }, label, opts.req ? h("span", { class: "req", text: " *" }) : null),
      input, opts.hint ? h("span", { class: "hint", id: opts.id ? "h-" + opts.id : null, text: opts.hint }) : null);
  }
  function select(id, opciones, valor) {
    var s = h("select", { id: id });
    opciones.forEach(function (o) {
      var v = typeof o === "string" ? o : o.v, t = typeof o === "string" ? o : o.t;
      s.append(h("option", { value: v, text: t, selected: v === valor }));
    });
    return s;
  }
  var VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

  // ---------- Registrar / editar venta ----------
  function dlgVenta(v, pre) {
    var u = yo(), dir = esDireccion();
    var nueva = !v;
    v = v ? clonar(v) : Object.assign({ fecha: hoy(), asesor: u.vende ? u.id : "", estatus: "Facturada", pago: "Crédito Banorte", plaza: "Monterrey", productos: {} }, pre || {});
    if (!nueva && !dir && v.asesor !== u.id) return;

    var iFecha = h("input", { type: "date", id: "vFecha", value: v.fecha });
    var vendedores = dir ? [{ v: "", t: "Elige vendedor" }].concat(VENDEDORES.map(function (x) { return { v: x.id, t: x.completo + " · " + P.ROLES[x.rol] }; })) : [{ v: u.id, t: u.completo }];
    var iAsesor = select("vAsesor", vendedores, v.asesor);
    if (!dir) iAsesor.disabled = true;
    var iCliente = h("input", { type: "text", id: "vCliente", value: v.cliente || "", placeholder: "Nombre y apellidos", autocomplete: "off" });
    var iNum = h("input", { type: "text", id: "vNum", value: v.numCliente || "", placeholder: "Número de cliente en Quiter", inputMode: "numeric", autocomplete: "off" });
    var iVin = h("input", { type: "text", id: "vVin", value: v.vin || "", placeholder: "17 caracteres", maxLength: 17, autocomplete: "off", class: "mono", style: "text-transform:uppercase;letter-spacing:.06em" });
    var vinHint = h("span", { class: "hint", id: "h-vin" });
    function revisarVin() {
      var x = iVin.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (iVin.value !== x) iVin.value = x;
      var dup = x && lista("ventas").filter(function (o) { return o.vin === x && o.id !== v.id && o.estatus !== "Cancelada"; })[0];
      vinHint.className = "hint";
      if (!x) vinHint.textContent = "Lo encuentras en la factura, en el parabrisas o en el marco de la puerta.";
      else if (/[IOQ]/.test(x)) { vinHint.textContent = "Un VIN no lleva I, O ni Q. Revisa si es 1 o 0."; vinHint.className = "hint bad"; }
      else if (x.length < 17) vinHint.textContent = x.length + " de 17 caracteres";
      else if (dup) { vinHint.textContent = "Este VIN ya está registrado en la venta de " + dup.cliente + "."; vinHint.className = "hint bad"; }
      else vinHint.textContent = "VIN completo";
    }
    iVin.addEventListener("input", revisarVin);
    revisarVin();
    var iModelo = select("vModelo", [{ v: "", t: "Elige modelo" }].concat(MODELOS.map(function (m) { return { v: m.id, t: m.nombre + " " + m.anio }; })), v.modelo || "");
    var colores = h("div", { class: "colors", role: "radiogroup", "aria-label": "Color de la unidad" });
    P.COLORES.forEach(function (c) {
      colores.append(h("label", null, h("input", { type: "radio", name: "vColor", value: c.id, checked: v.color === c.id }), h("span", { class: "swatch", style: "background:" + c.hex }), c.id));
    });
    var iPago = select("vPago", ["Crédito Banorte", "Crédito otro banco", "Contado"], v.pago);
    var iPlaza = select("vPlaza", ["Monterrey", "Piedras Negras"], v.plaza);
    var iEstatus = select("vEstatus", ["Apartada", "Facturada", "Entregada", "Cancelada"], v.estatus);
    var iEntrega = h("input", { type: "date", id: "vEntrega", value: v.fechaEntrega || "" });
    var iColorNom = h("input", { type: "text", id: "vColorNom", value: v.colorNombre || "", placeholder: "Opcional. Ej. Time Grey, Snow White", autocomplete: "off" });
    var chips = h("div", { class: "chips" });
    PROD.forEach(function (p) {
      chips.append(h("label", { class: "chip" }, h("input", { type: "checkbox", value: p.id, checked: !!(v.productos && v.productos[p.id]) }), h("span", { class: "chk", "aria-hidden": "true", text: "✓" }), p.label));
    });
    var iNotas = h("textarea", { id: "vNotas", value: v.notas || "", placeholder: "Opcional: monto de accesorios, aseguradora, detalle de placas…" });
    var errores = h("div", { class: "note warn", hidden: true });

    var body = h("div", { class: "form" },
      campo("Fecha de venta", iFecha, { req: true }),
      campo("Vendedor", iAsesor, { req: true, id: "asesor", hint: dir ? "Jorge también aparece como vendedor." : null }),
      campo("Cliente", iCliente, { req: true, id: "cliente" }),
      campo("Número de cliente", iNum, { hint: "Quiter → Fichas maestras → Cuentas personales." }),
      h("div", { class: "f", id: "f-vin" }, h("label", { for: "vVin" }, "VIN"), iVin, vinHint),
      campo("Modelo", iModelo, { req: true, id: "modelo" }),
      h("div", { class: "f full", id: "f-color" }, h("span", { class: "lbl" }, "Color de la unidad", h("span", { class: "req", text: " *" })), colores),
      campo("Nombre comercial del color", iColorNom, { full: true }),
      campo("Forma de pago", iPago), campo("Plaza", iPlaza),
      campo("Estatus", iEstatus, { hint: "Las canceladas no cuentan en el tablero." }),
      campo("Fecha de entrega", iEntrega, { hint: "Al entregar, cambia el estatus a Entregada." }),
      h("div", { class: "f full" }, h("span", { class: "lbl", text: "Productos vendidos (KPIs)" }), chips, h("span", { class: "hint", text: "Marca todo lo que se llevó el cliente: cuenta para tu penetración por producto." })),
      campo("Notas", iNotas, { full: true }),
      h("div", { class: "f full" }, errores));

    function guardar() {
      var color = (body.querySelector('input[name="vColor"]:checked') || {}).value || "";
      var vin = iVin.value.trim().toUpperCase();
      var errs = [];
      body.querySelectorAll(".f.err").forEach(function (x) { x.classList.remove("err"); });
      function falta(id, msg) { errs.push(msg); var f = $("f-" + id); if (f) f.classList.add("err"); }
      if (!iCliente.value.trim()) falta("cliente", "Escribe el nombre del cliente.");
      if (!iAsesor.value) falta("asesor", "Elige quién vendió la unidad.");
      if (!iModelo.value) falta("modelo", "Elige el modelo.");
      if (!color) falta("color", "Elige el color de la unidad.");
      if (vin && !VIN_RE.test(vin)) falta("vin", "El VIN debe tener 17 caracteres, sin I, O ni Q.");
      if (!iFecha.value) errs.push("Pon la fecha de venta.");
      if (errs.length) { errores.hidden = false; errores.innerHTML = ""; errores.append(h("strong", { text: "Falta completar:" }), h("ul", { style: "margin:6px 0 0;padding-left:18px" }, errs.map(function (e) { return h("li", { text: e }); }))); return; }
      var prods = {};
      chips.querySelectorAll("input:checked").forEach(function (c) { prods[c.value] = true; });
      var doc = Object.assign(v, {
        fecha: iFecha.value, asesor: iAsesor.value, cliente: iCliente.value.trim(), numCliente: iNum.value.trim(), vin: vin,
        modelo: iModelo.value, color: color, colorNombre: iColorNom.value.trim(), fechaEntrega: iEntrega.value, pago: iPago.value, plaza: iPlaza.value, estatus: iEstatus.value, productos: prods, notas: iNotas.value.trim(),
      });
      if (nueva) { doc.creado = Date.now(); doc.creadoPor = u.id; }
      put("ventas", doc.id || nuevoId(), doc);
      $("dlg").close();
      filtros.mes = mesDe(doc.fecha);
      toast(nueva ? "Venta registrada" : "Venta actualizada");
      render();
    }
    var foot = [btn(nueva ? "Registrar venta" : "Guardar cambios", guardar), btn("Cancelar", function () { $("dlg").close(); }, "line")];
    if (!nueva) foot.push(h("span", { class: "spacer" }), btn("Borrar", function () {
      confirmar("¿Borrar esta venta?", "Se borra la venta de " + v.cliente + " para todo el equipo. Si solo se cayó, mejor cámbiala a Cancelada.", "Borrar venta", function () { quitar("ventas", v.id); toast("Venta borrada"); render(); });
    }, "danger"));
    abrirDlg(nueva ? "Registrar venta" : "Editar venta", body, foot);
    setTimeout(function () { (nueva ? iCliente : iVin).focus(); }, 50);
  }

  // ---------- Tablero de reporte ----------
  function vReporte(page) {
    var dir = esDireccion();
    if (!dir) filtros.asesor = yo().id;
    var asesor = dir ? filtros.asesor : yo().id;
    var vs = ventasMes(filtros.mes, asesor);
    var r = resumen(vs);
    var o = objetivos(filtros.mes);
    var meta = metaDe(filtros.mes, asesor);
    var quien = asesor === "todos" ? "Equipo completo" : (userById(asesor) || {}).completo;
    page.append(cabecera("Tablero de reporte", Mayus(nombreMes(filtros.mes)), quien + " · " + P.agencia + ". Descárgalo como imagen para mandarlo por WhatsApp.",
      [btn("Descargar imagen", function () { descargarImagen(filtros.mes, asesor); }, "", "descargar"), btn("Exportar CSV", function () { exportarCsv(vs); }, "line")]));
    var bar = h("div", { class: "row" }, selMes(filtros.mes, function (m) { filtros.mes = m; render(); }));
    if (dir) bar.append(segAsesor(filtros.asesor, function (a) { filtros.asesor = a; render(); }));
    page.append(bar);

    page.append(h("div", { class: "tiles" },
      tile("Unidades vendidas", String(r.n), "Meta: " + meta),
      tile("Cumplimiento", pct(meta ? r.n / meta : 0), r.n >= meta && meta ? "Meta cumplida" : "Faltan " + Math.max(meta - r.n, 0)),
      tile("Productos por unidad", r.porUnidad.toFixed(1), r.totalProd + " productos en " + r.n + " unidades"),
      tile("Entregadas", String(r.entregadas), (r.n - r.entregadas) + " por entregar")));

    if (!r.n) {
      page.append(h("div", { class: "empty" }, h("strong", { text: "Sin ventas en " + nombreMes(filtros.mes) }),
        h("span", { text: "En cuanto registres ventas aquí verás penetración por producto, ranking, modelos y colores." }),
        (yo().vende || dir) ? btn("Registrar venta", function () { dlgVenta(null); }, "", "mas") : null));
      return;
    }

    var cProd = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Penetración por producto" }), h("span", { class: "hint", text: "% de unidades que lo llevan" })));
    var b1 = h("div", { class: "bars" });
    PROD.forEach(function (p) {
      var pc = r.n ? r.prod[p.id] / r.n : 0;
      var m = o.productos[p.id] / 100;
      b1.append(barRow(p.label, pc, 1, pct(pc) + " <small>" + r.prod[p.id] + "/" + r.n + "</small>", m));
    });
    cProd.append(b1, leyendaMeta());

    var grid = h("div", { class: "grid2" });
    grid.append(cProd);
    if (asesor === "todos") grid.append(rankingCard(filtros.mes, r));
    else {
      var cU = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Avance contra la meta" })));
      cU.append(h("div", { class: "bars" }, barRow("Unidades", r.n, Math.max(meta, r.n, 1), r.n + " <small>/ " + meta + "</small>", meta)), leyendaMeta());
      grid.append(cU);
    }
    page.append(grid);

    var grid2 = h("div", { class: "grid2" });
    var cM = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Unidades por modelo" })));
    var mods = ordenar(r.modelos), maxM = mods.length ? mods[0].n : 1;
    var bm = h("div", { class: "bars" });
    mods.forEach(function (x) { bm.append(barRow(nombreModelo(x.k), x.n, maxM, x.n + " <small>" + pct(x.n / r.n) + "</small>")); });
    cM.append(bm);
    var cC = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Unidades por color" })));
    var cols = ordenar(r.colores), maxC = cols.length ? cols[0].n : 1;
    var bc = h("div", { class: "bars" });
    cols.forEach(function (x) { bc.append(barRow(x.k, x.n, maxC, x.n + " <small>" + pct(x.n / r.n) + "</small>", null, colorHex(x.k))); });
    cC.append(bc);
    grid2.append(cM, cC);
    page.append(grid2);

    var vsOrd = vs.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; });
    page.append(h("div", { class: "card", style: "padding:14px 10px 6px" }, h("div", { class: "card-head", style: "padding:0 8px" }, h("h2", { text: "Detalle de ventas" }), h("span", { class: "hint", text: vs.length + " unidades" })), tablaVentas(vsOrd, true)));
  }

  // ---------- Imagen del reporte (PNG) ----------
  function cargarFuentes() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 64px "Barlow Condensed"'), document.fonts.load('600 40px "Barlow Condensed"'),
      document.fonts.load('400 24px "IBM Plex Sans"'), document.fonts.load('600 24px "IBM Plex Sans"'),
    ]).catch(function () {});
  }
  function dibujarReporte(mes, asesor) {
    var vs = ventasMes(mes, asesor), r = resumen(vs), o = objetivos(mes), meta = metaDe(mes, asesor);
    var quien = asesor === "todos" ? "Equipo completo" : (userById(asesor) || {}).completo;
    var C = { bg: "#f3f4f6", card: "#ffffff", ink: "#12151a", muted: "#5a616d", line: "#dde1e7", bar: "#34558f", track: "#e4e8ee", ok: "#2f7a45", band: "#12151a", bone: "#e8e4dc" };
    var DISP = '"Barlow Condensed", "Arial Narrow", sans-serif', SANS = '"IBM Plex Sans", "Segoe UI", Arial, sans-serif';
    var W = 1080, pad = 56;
    var mods = ordenar(r.modelos).slice(0, 8), cols = ordenar(r.colores).slice(0, 8);
    var team = asesor === "todos";
    var secH = function (n) { return 90 + n * 52; };
    var MAXD = 30, det = vs.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; });
    var detN = Math.min(det.length, MAXD), detH = det.length ? 130 + detN * 40 + (det.length > MAXD ? 30 : 0) : 0;
    var H = 480 + secH(PROD.length) + (team ? secH(VENDEDORES.length) : 0) + secH(Math.max(mods.length, cols.length, 1)) + detH + 60;
    var cv = document.createElement("canvas");
    var scale = 2;
    cv.width = W * scale; cv.height = H * scale;
    var x = cv.getContext("2d");
    x.scale(scale, scale);
    function rr(px, py, w, hh, rad, fill) { x.beginPath(); x.roundRect ? x.roundRect(px, py, w, hh, rad) : x.rect(px, py, w, hh); x.fillStyle = fill; x.fill(); }
    function txt(s, px, py, font, color, align) { x.font = font; x.fillStyle = color; x.textAlign = align || "left"; x.textBaseline = "alphabetic"; x.fillText(s, px, py); }
    function fit(s, maxW, font) { x.font = font; if (x.measureText(s).width <= maxW) return s; while (s.length > 1 && x.measureText(s + "…").width > maxW) s = s.slice(0, -1); return s + "…"; }
    x.fillStyle = C.bg; x.fillRect(0, 0, W, H);
    // Banda superior
    x.fillStyle = C.band; x.fillRect(0, 0, W, 250);
    txt("PARK POINT", pad, 92, "700 64px " + DISP, C.bone);
    txt(P.agencia.toUpperCase() + " · " + P.grupo.toUpperCase(), pad, 128, "600 18px " + SANS, "#9298a3");
    txt("Reporte de ventas · " + Mayus(nombreMes(mes)), pad, 192, "600 44px " + DISP, "#ffffff");
    txt(quien, pad, 226, "400 22px " + SANS, "#c9ccd2");
    txt("Corte al " + fechaLarga(hoy()).toLowerCase() + " · " + horaMty(), W - pad, 226, "400 18px " + SANS, "#9298a3", "right");
    // Tiles
    var y = 290, tw = (W - pad * 2 - 3 * 16) / 4;
    [["Unidades", String(r.n), "Meta " + meta], ["Cumplimiento", pct(meta ? r.n / meta : 0), r.n >= meta && meta ? "Meta cumplida" : "Faltan " + Math.max(meta - r.n, 0)],
     ["Productos / unidad", r.porUnidad.toFixed(1), r.totalProd + " productos"], ["Entregadas", String(r.entregadas), (r.n - r.entregadas) + " por entregar"]].forEach(function (t, i) {
      var tx = pad + i * (tw + 16);
      rr(tx, y, tw, 150, 18, C.card);
      txt(t[0], tx + 20, y + 38, "500 18px " + SANS, C.muted);
      txt(t[1], tx + 20, y + 102, "600 62px " + DISP, C.ink);
      txt(t[2], tx + 20, y + 132, "400 17px " + SANS, C.muted);
    });
    y += 190;
    function seccion(titulo, filas, opts) {
      var hh = 80 + filas.length * 52 - 10;
      rr(pad, y, W - pad * 2, hh, 18, C.card);
      txt(titulo, pad + 24, y + 46, "600 30px " + DISP, C.ink);
      if (opts.nota) txt(opts.nota, W - pad - 24, y + 44, "400 17px " + SANS, C.muted, "right");
      var fy = y + 84, lw = opts.lw || 260, vx = W - pad - 24, bx = pad + 24 + lw, bw = vx - (opts.vw || 160) - bx;
      filas.forEach(function (f) {
        var lx = pad + 24;
        if (f.sw) { x.beginPath(); x.arc(lx + 9, fy - 6, 9, 0, Math.PI * 2); x.fillStyle = f.sw; x.fill(); x.strokeStyle = C.line; x.lineWidth = 1; x.stroke(); lx += 28; }
        txt(fit(f.l, lw - (lx - pad - 24) - 10, "500 20px " + SANS), lx, fy, "500 20px " + SANS, C.ink);
        rr(bx, fy - 18, bw, 16, 4, C.track);
        var w = Math.max(Math.min(f.v / (f.max || 1), 1) * bw, f.v > 0 ? 3 : 0);
        if (w) rr(bx, fy - 18, w, 16, 4, C.bar);
        if (f.m != null) { var mx = bx + Math.min(f.m / (f.max || 1), 1) * bw; x.fillStyle = C.ink; x.fillRect(mx - 1.5, fy - 24, 3, 28); }
        txt(f.t, vx, fy, "600 22px " + SANS, C.ink, "right");
        fy += 52;
      });
      y += hh + 20;
    }
    seccion("Penetración por producto", PROD.map(function (p) { var pc = r.n ? r.prod[p.id] / r.n : 0; return { l: p.label, v: pc, max: 1, m: o.productos[p.id] / 100, t: pct(pc) + "  (" + r.prod[p.id] + "/" + r.n + ")" }; }), { nota: "Barra = real · línea = meta" });
    if (team) {
      var maxU = Math.max.apply(null, VENDEDORES.map(function (u) { return Math.max(o.metas[u.id], r.asesores[u.id].n); }).concat([1]));
      seccion("Ranking de vendedores", VENDEDORES.slice().sort(function (a, b) { return r.asesores[b.id].n - r.asesores[a.id].n; }).map(function (u) {
        var a = r.asesores[u.id]; return { l: u.completo, v: a.n, max: maxU, m: o.metas[u.id], t: a.n + " / " + o.metas[u.id] + " · " + (a.n ? (a.prod / a.n).toFixed(1) : "0") + " p/u" };
      }), { nota: "Unidades / meta · productos por unidad", vw: 220 });
    }
    // Modelos y colores lado a lado
    var filas = Math.max(mods.length, cols.length, 1), hh = 80 + filas * 52 - 10, cw = (W - pad * 2 - 20) / 2;
    [["Unidades por modelo", mods, false], ["Unidades por color", cols, true]].forEach(function (s, i) {
      var cx = pad + i * (cw + 20);
      rr(cx, y, cw, hh, 18, C.card);
      txt(s[0], cx + 24, y + 46, "600 30px " + DISP, C.ink);
      var fy = y + 84, max = s[1].length ? s[1][0].n : 1;
      if (!s[1].length) txt("Sin datos", cx + 24, fy, "400 20px " + SANS, C.muted);
      s[1].forEach(function (f) {
        var lx = cx + 24;
        if (s[2]) { x.beginPath(); x.arc(lx + 9, fy - 6, 9, 0, Math.PI * 2); x.fillStyle = colorHex(f.k); x.fill(); x.strokeStyle = C.line; x.lineWidth = 1; x.stroke(); lx += 28; }
        var label = s[2] ? f.k : nombreModelo(f.k);
        txt(fit(label, 190 - (lx - cx - 24), "500 19px " + SANS), lx, fy, "500 19px " + SANS, C.ink);
        var bx = cx + 220, bw = cw - 220 - 70;
        rr(bx, fy - 17, bw, 14, 4, C.track);
        rr(bx, fy - 17, Math.max(f.n / max * bw, 3), 14, 4, C.bar);
        txt(String(f.n), cx + cw - 24, fy, "600 22px " + SANS, C.ink, "right");
        fy += 52;
      });
    });
    y += hh + 20;
    if (det.length) {
      var dh = detH - 20;
      rr(pad, y, W - pad * 2, dh, 18, C.card);
      txt("Detalle de operaciones", pad + 24, y + 46, "600 30px " + DISP, C.ink);
      txt(det.length + " unidades", W - pad - 24, y + 44, "400 17px " + SANS, C.muted, "right");
      var cx0 = pad + 24;
      var colsD = [["Fecha", 64], ["Vendedor", 104], ["Cliente", 196], ["No. cliente", 104], ["VIN", 112], ["Modelo", 172], ["Color", 106], ["Prod.", 50]];
      var ty = y + 90;
      var cxx = cx0;
      colsD.forEach(function (c) { txt(c[0].toUpperCase(), cxx, ty, "600 13px " + SANS, C.muted); cxx += c[1]; });
      x.fillStyle = C.line; x.fillRect(cx0, ty + 10, W - pad * 2 - 48, 1);
      ty += 40;
      det.slice(0, MAXD).forEach(function (v) {
        var vals = [fechaCorta(v.fecha), (userById(v.asesor) || {}).nombre || v.asesor, v.cliente, v.numCliente || "—", v.vin ? "…" + v.vin.slice(-8) : "—", nombreModelo(v.modelo), v.colorNombre || v.color || "—", contarProd(v) + "/" + PROD.length];
        cxx = cx0;
        vals.forEach(function (val, i) {
          if (i === 6) { x.beginPath(); x.arc(cxx + 6, ty - 6, 6, 0, Math.PI * 2); x.fillStyle = colorHex(v.color); x.fill(); x.strokeStyle = C.line; x.lineWidth = 1; x.stroke(); }
          var off = i === 6 ? 18 : 0;
          txt(fit(String(val), colsD[i][1] - 10 - off, "400 16px " + SANS), cxx + off, ty, (i === 7 ? "600" : "400") + " 16px " + SANS, C.ink);
          cxx += colsD[i][1];
        });
        x.fillStyle = C.line; x.fillRect(cx0, ty + 14, W - pad * 2 - 48, 1);
        ty += 40;
      });
      if (det.length > MAXD) txt("y " + (det.length - MAXD) + " más en el portal", cx0, ty + 4, "400 16px " + SANS, C.muted);
      y += dh + 20;
    }
    txt("Generado por " + (yo().rol === "ceo" ? "CEO" : yo().completo) + " en el portal Park Point · las ventas canceladas no cuentan", pad, H - 28, "400 16px " + SANS, C.muted);
    return cv;
  }
  function descargarImagen(mes, asesor) {
    toast("Preparando imagen…");
    cargarFuentes().then(function () {
      var cv = dibujarReporte(mes, asesor);
      var quien = asesor === "todos" ? "equipo" : asesor;
      var nombre = "reporte-park-point-" + mes + "-" + quien + ".png";
      cv.toBlob(function (blob) {
        if (!blob) { toast("No se pudo generar la imagen."); return; }
        guardarArchivo(nombre, blob, function () { mostrarImagen(cv, nombre); });
      }, "image/png");
    });
  }
  function guardarArchivo(nombre, data, sinDescarga) {
    if (window.claude && typeof window.claude.use === "function") {
      window.claude.use("downloads").then(function (dl) {
        if (!dl) { if (sinDescarga) sinDescarga(); else toast("Las descargas no están disponibles aquí."); return; }
        dl.save({ filename: nombre, data: data }).then(function () { toast("Descargado: " + nombre); }, function (e) {
          if (e && e.code === "declined") return;
          if (e && e.code === "rate_limited") { toast("Ya hay una descarga pendiente de confirmar."); return; }
          if (sinDescarga) sinDescarga(); else toast("No se pudo descargar.");
        });
      });
      return;
    }
    var a = h("a", { href: URL.createObjectURL(data instanceof Blob ? data : new Blob([data])), download: nombre });
    document.body.append(a); a.click(); a.remove();
    toast("Descargado: " + nombre);
  }
  function mostrarImagen(cv, nombre) {
    var img = h("img", { src: cv.toDataURL("image/png"), alt: "Reporte " + nombre, style: "width:100%;border-radius:12px;border:1px solid var(--line)" });
    abrirDlg("Imagen del reporte", h("div", { style: "display:grid;gap:10px" }, h("p", { class: "hint", style: "margin:0", text: "Mantén presionada la imagen (o clic derecho) para guardarla o compartirla." }), img),
      [btn("Cerrar", function () { $("dlg").close(); }, "line")]);
  }
  function exportarCsv(vs) {
    var head = ["Fecha", "Vendedor", "Cliente", "Número de cliente", "VIN", "Modelo", "Color", "Nombre del color", "Forma de pago", "Plaza", "Estatus", "Fecha de entrega"].concat(PROD.map(function (p) { return p.label; })).concat(["Productos", "Notas"]);
    var rows = [head].concat(vs.map(function (v) {
      return [v.fecha, (userById(v.asesor) || {}).completo || v.asesor, v.cliente, v.numCliente, v.vin, nombreModelo(v.modelo), v.color, v.colorNombre || "", v.pago, v.plaza, v.estatus, v.fechaEntrega || ""]
        .concat(PROD.map(function (p) { return v.productos && v.productos[p.id] ? "Sí" : "No"; })).concat([contarProd(v), v.notas || ""]);
    }));
    var csv = "\ufeff" + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    guardarArchivo("ventas-park-point-" + filtros.mes + ".csv", csv);
  }

  // ---------- Objetivos ----------
  function vObjetivos(page) {
    var dir = esDireccion(), mes = filtros.mes;
    var o = objetivos(mes), eq = resumen(ventasMes(mes, "todos"));
    var esMesActual = mes === hoy().slice(0, 7);
    var dLeft = esMesActual ? diasDelMes(mes) - Number(hoy().slice(8, 10)) : 0;
    page.append(cabecera("Objetivos Park Point", Mayus(nombreMes(mes)), dir ? "Define la meta de unidades de cada vendedor y la meta de penetración de cada producto. Todos ven su avance en vivo." : "Tus metas del mes y el avance del equipo. Las define la gerencia.",
      [selMes(mes, function (m) { filtros.mes = m; render(); })]));
    if (!o.guardado) page.append(h("div", { class: "note" }, "Este mes usa las metas iniciales: " + P.metaUnidades + " unidades por vendedor y " + P.metaProducto + "% en cada producto." + (dir ? " Ajústalas y guarda." : "")));

    var inputs = {};
    var cU = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Unidades por vendedor" }), esMesActual ? h("span", { class: "pill", text: dLeft + " días restantes" }) : null));
    var t = h("table", { class: "t" });
    t.append(h("thead", null, h("tr", null, h("th", { text: "Vendedor" }), h("th", { class: "r", text: "Meta" }), h("th", { class: "r", text: "Vendidas" }), h("th", { text: "Avance", style: "width:34%" }), h("th", { class: "r", text: "Faltan" }), h("th", { class: "r hide-sm", text: "Ritmo / semana" }))));
    var tb = h("tbody"), totM = 0, totV = 0;
    VENDEDORES.forEach(function (u) {
      var m = o.metas[u.id], n = eq.asesores[u.id].n;
      totM += m; totV += n;
      var faltan = Math.max(m - n, 0);
      var inp = dir ? h("input", { type: "number", id: "meta-" + u.id, min: "0", value: m, style: "width:76px;text-align:right" }) : null;
      inputs[u.id] = inp;
      var ritmo = faltan && esMesActual ? (faltan / Math.max(dLeft / 7, 1 / 7)).toFixed(1) : "—";
      tb.append(h("tr", { style: u.id === yo().id ? "font-weight:600" : "" },
        h("td", { style: "white-space:nowrap" }, u.completo, h("div", { class: "hint", text: P.ROLES[u.rol] })),
        h("td", { class: "r" }, inp || String(m)), h("td", { class: "r", text: String(n) }),
        h("td", null, h("div", { class: "track lg" }, h("i", { style: "width:" + (m ? Math.min(n / m, 1) * 100 : 0) + "%" }))),
        h("td", { class: "r" }, faltan ? String(faltan) : h("span", { class: "pill ok", text: "Cumplida" })),
        h("td", { class: "r hide-sm", text: ritmo })));
    });
    tb.append(h("tr", null, h("td", null, h("strong", { text: "Equipo" })), h("td", { class: "r" }, h("strong", { text: String(totM) })), h("td", { class: "r" }, h("strong", { text: String(totV) })),
      h("td", null, h("div", { class: "track lg" }, h("i", { style: "width:" + (totM ? Math.min(totV / totM, 1) * 100 : 0) + "%" }))), h("td", { class: "r", text: String(Math.max(totM - totV, 0)) }), h("td", { class: "r hide-sm", text: "" })));
    t.append(tb);
    cU.append(h("div", { class: "tablewrap" }, t));

    var cP = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Penetración por producto" }), h("span", { class: "hint", text: "Meta en % de unidades" })));
    var t2 = h("table", { class: "t" });
    t2.append(h("thead", null, h("tr", null, h("th", { text: "Producto" }), h("th", { class: "r", text: "Meta %" }), h("th", { text: "Equipo", style: "width:40%" }), h("th", { class: "r", text: "Real" }))));
    var tb2 = h("tbody"), pinputs = {};
    PROD.forEach(function (p) {
      var real = eq.n ? eq.prod[p.id] / eq.n : 0, m = o.productos[p.id];
      var inp = dir ? h("input", { type: "number", id: "pmeta-" + p.id, min: "0", max: "100", value: m, style: "width:70px;text-align:right" }) : null;
      pinputs[p.id] = inp;
      var track = h("div", { class: "track lg" }, h("i", { style: "width:" + Math.min(real, 1) * 100 + "%" }), h("b", { style: "left:calc(" + Math.min(m, 100) + "% - 1px)" }));
      tb2.append(h("tr", null, h("td", { text: p.label }), h("td", { class: "r" }, inp || m + "%"), h("td", null, track),
        h("td", { class: "r" }, h("span", { class: "pill " + (real * 100 >= m ? "ok" : "warn"), text: pct(real) }))));
    });
    t2.append(tb2);
    cP.append(h("div", { class: "tablewrap" }, t2), leyendaMeta());

    page.append(h("div", { class: "grid2" }, cU, cP));
    if (dir) {
      page.append(h("div", { class: "row" }, btn("Guardar metas de " + nombreMes(mes), function () {
        var doc = { mes: mes, metas: {}, productos: {}, por: yo().id };
        VENDEDORES.forEach(function (u) { doc.metas[u.id] = Math.max(0, Number(inputs[u.id].value) || 0); });
        PROD.forEach(function (p) { doc.productos[p.id] = Math.min(100, Math.max(0, Number(pinputs[p.id].value) || 0)); });
        put("config", "obj-" + mes, doc, 0);
        toast("Metas guardadas");
        render();
      })));
    }
    var kpis = [["Unidades vendidas", "3–4"], ["Contactos nuevos", "72–80"], ["Citas agendadas", "22–25"], ["Pruebas de manejo", "13"], ["Respuesta en WhatsApp", "< 5 min"], ["Asistencia a citas", "70%+"], ["Cierre sobre pruebas", "25–35%"], ["Referidos pedidos / recibidos", "10 / 2"], ["Venta cruzada", "1 de cada 2 ventas"]];
    page.append(h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "KPIs de cada lunes (meta semanal por asesor)" })),
      h("div", { class: "tablewrap" }, h("table", { class: "t" }, h("tbody", null, kpis.map(function (k) { return h("tr", null, h("td", { text: k[0] }), h("td", { class: "r" }, h("strong", { text: k[1] }))); })))),
      h("p", { class: "hint", style: "margin:10px 0 0", text: "Regla del lunes: el número más lejos de su meta es la única prioridad de la semana." })));
  }

  // ---------- Corte de piso ----------
  var pisoFecha = null;
  function vPiso(page) {
    var u = yo(), dir = esDireccion();
    var fecha = pisoFecha || hoy();
    page.append(cabecera("Corte de piso", "Park Point", "Lleva la cuenta del día con + y −. Cortes de 11:00 a 20:00 y cierre a las 20:30.",
      [h("input", { type: "date", id: "pisoFecha", value: fecha, style: "width:auto", onchange: function (e) { pisoFecha = e.target.value || null; render(); } })]));
    var grid = h("div", { class: "grid2" });
    if (u.vende) {
      var id = fecha + "_" + u.id;
      var doc = D.cortes[id] || { fecha: fecha, usuario: u.id, valores: {} };
      var lst = h("div", { style: "display:grid;gap:8px" });
      var pre = h("pre", { class: "out" });
      function texto() {
        var p = fecha.split("-");
        return ["Asesor: " + u.completo, "Fecha: " + p[2] + "/" + p[1] + "/" + p[0], "CORTE " + horaMty()].concat(P.CORTE.map(function (c) { return c.label + ": " + (doc.valores[c.id] || 0); })).join("\n");
      }
      P.CORTE.forEach(function (c) {
        var n = h("span", { class: "num", text: String(doc.valores[c.id] || 0) });
        function cambiar(d) {
          doc = clonar(D.cortes[id] || doc);
          doc.valores[c.id] = Math.max(0, (doc.valores[c.id] || 0) + d);
          doc.fecha = fecha; doc.usuario = u.id;
          put("cortes", id, doc, 900);
          n.textContent = String(doc.valores[c.id]);
          pre.textContent = texto();
        }
        lst.append(h("div", { class: "counter" }, h("span", { text: c.label }),
          h("button", { type: "button", text: "−", "aria-label": "Restar " + c.label, onclick: function () { cambiar(-1); } }), n,
          h("button", { type: "button", class: "plus", text: "+", "aria-label": "Sumar " + c.label, onclick: function () { cambiar(1); } })));
      });
      pre.textContent = texto();
      grid.append(h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Tu corte · " + fechaCorta(fecha) })), lst),
        h("div", { class: "card", style: "align-self:start;display:grid;gap:12px" }, h("h2", { text: "Texto del corte" }), pre,
          h("div", { class: "row" }, btn("Copiar corte", function () { copiar(texto(), "Corte copiado"); }), h("a", { class: "btn wa", href: waUrl("", texto()), target: "_blank", rel: "noopener", text: "Mandar por WhatsApp" }))));
    }
    if (dir) {
      var t = h("table", { class: "t" });
      t.append(h("thead", null, h("tr", null, h("th", { text: "Concepto" }), VENDEDORES.map(function (v) { return h("th", { class: "r", text: v.nombre }); }), h("th", { class: "r", text: "Total" }))));
      var tb = h("tbody");
      P.CORTE.forEach(function (c) {
        var tot = 0;
        var tds = VENDEDORES.map(function (v) { var d = D.cortes[fecha + "_" + v.id]; var n = d && d.valores[c.id] || 0; tot += n; return h("td", { class: "r", text: String(n) }); });
        tb.append(h("tr", null, h("td", { text: c.label }), tds, h("td", { class: "r" }, h("strong", { text: String(tot) }))));
      });
      tb.append(h("tr", null, h("td", { class: "hint", text: "Última actualización" }), VENDEDORES.map(function (v) {
        var d = D.cortes[fecha + "_" + v.id];
        return h("td", { class: "r" }, d ? h("span", { class: "pill ok", text: new Date(d.actualizado).toLocaleTimeString("es-MX", { timeZone: "America/Monterrey", hour: "2-digit", minute: "2-digit" }) }) : h("span", { class: "pill warn", text: "Sin corte" }));
      }), h("td")));
      t.append(tb);
      var cardEq = h("div", { class: "card", style: u.vende ? "grid-column:1/-1" : "" }, h("div", { class: "card-head" }, h("h2", { text: "Corte del equipo · " + fechaCorta(fecha) })), h("div", { class: "tablewrap" }, t));
      grid.append(cardEq);
    }
    page.append(grid);
  }

  // ---------- CRM ----------
  var crmAsesor = "todos";
  function vCrm(page) {
    var u = yo(), dir = esDireccion();
    var ver = dir ? crmAsesor : u.id;
    page.append(cabecera("Prospectos", "CRM", "Nuevo → Referidor. Cada prospecto con su siguiente acción y fecha. Seguimiento con razón, nunca “¿sigues interesado?”.",
      (u.vende || dir) ? [btn("Nuevo prospecto", function () { dlgLead(null); }, "", "mas")] : null));
    if (dir) page.append(h("div", { class: "row" }, segAsesor(crmAsesor, function (a) { crmAsesor = a; render(); })));
    var leads = lista("leads").filter(function (l) { return puedeVer(l.asesor) && (ver === "todos" || l.asesor === ver); });
    if (!leads.length) {
      page.append(h("div", { class: "empty" }, h("strong", { text: "Sin prospectos todavía" }), h("span", { text: "Da de alta a cada persona que te escribe o visita Park Point con su siguiente acción." }),
        btn("Nuevo prospecto", function () { dlgLead(null); }, "", "mas")));
      return;
    }
    var kb = h("div", { class: "kanban" });
    P.ETAPAS.forEach(function (et) {
      var col = leads.filter(function (l) { return l.etapa === et.id; }).sort(function (a, b) { return (a.fechaSig || "9") < (b.fechaSig || "9") ? -1 : 1; });
      var st = h("div", { class: "stack" });
      col.forEach(function (l) {
        var due = l.fechaSig && l.fechaSig <= hoy() && et.id !== "entregado" && et.id !== "referidor";
        var calor = { alta: "warn", media: "acc", fria: "" }[l.calor] || "";
        st.append(h("button", { type: "button", class: "lead" + (due ? " due" : ""), onclick: function () { dlgLead(l); } },
          h("span", { class: "row", style: "justify-content:space-between;flex-wrap:nowrap" }, h("strong", { text: l.nombre }), l.calor ? h("span", { class: "pill " + calor, text: l.calor }) : null),
          h("span", { class: "muted", text: nombreModelo(l.modelo) + (dir ? " · " + ((userById(l.asesor) || {}).nombre || "") : "") }),
          l.siguiente ? h("span", { text: l.siguiente }) : null,
          l.fechaSig ? h("span", { class: "hint", text: (due ? "Vence " : "Próximo: ") + (l.fechaSig === hoy() ? "hoy" : fechaCorta(l.fechaSig)) }) : null));
      });
      kb.append(h("div", { class: "col" }, h("h3", null, et.label, h("span", { text: "· " + col.length })), st));
    });
    page.append(kb);
  }
  function dlgLead(l) {
    var u = yo(), dir = esDireccion(), nuevo = !l;
    l = l ? clonar(l) : { asesor: u.vende ? u.id : "", etapa: "nuevo", origen: "Park Point", calor: "media", fechaSig: hoy() };
    var iNombre = h("input", { type: "text", id: "lNombre", value: l.nombre || "", autocomplete: "off" });
    var iTel = h("input", { type: "tel", id: "lTel", value: l.tel || "", placeholder: "10 dígitos", autocomplete: "off" });
    var iAsesor = select("lAsesor", (dir ? [{ v: "", t: "Elige vendedor" }] : []).concat((dir ? VENDEDORES : [u]).map(function (x) { return { v: x.id, t: x.completo }; })), l.asesor);
    var iModelo = select("lModelo", [{ v: "", t: "Sin definir" }].concat(MODELOS.map(function (m) { return { v: m.id, t: m.nombre + " " + m.anio }; })), l.modelo || "");
    var iEtapa = select("lEtapa", P.ETAPAS.map(function (e) { return { v: e.id, t: e.label }; }), l.etapa);
    var iOrigen = select("lOrigen", P.ORIGENES, l.origen);
    var iCalor = select("lCalor", [{ v: "alta", t: "Alta" }, { v: "media", t: "Media" }, { v: "fria", t: "Fría" }], l.calor);
    var iSig = h("input", { type: "text", id: "lSig", value: l.siguiente || "", placeholder: "Ej. Mandar escenario a 72 meses con 50%" });
    var iFecha = h("input", { type: "date", id: "lFecha", value: l.fechaSig || "" });
    var iEng = h("input", { type: "number", id: "lEng", value: l.enganche || "", placeholder: "$" });
    var iToma = h("input", { type: "text", id: "lToma", value: l.toma || "", placeholder: "Auto a cuenta, si trae" });
    var iNotas = h("textarea", { id: "lNotas", value: l.notas || "" });
    var err = h("p", { class: "hint bad", hidden: true, style: "margin:0" });
    var body = h("div", { class: "form" },
      campo("Nombre", iNombre, { req: true, id: "lnombre" }), campo("WhatsApp", iTel),
      campo("Vendedor", iAsesor, { req: true, id: "lasesor" }), campo("Modelo de interés", iModelo),
      campo("Etapa", iEtapa), campo("Origen", iOrigen), campo("Calor", iCalor), campo("Enganche posible", iEng),
      campo("Siguiente acción", iSig, { full: true }), campo("Fecha del siguiente contacto", iFecha), campo("Toma a cuenta", iToma),
      campo("Notas", iNotas, { full: true }), h("div", { class: "f full" }, err));
    function datos() {
      return Object.assign(l, { nombre: iNombre.value.trim(), tel: iTel.value.trim(), asesor: iAsesor.value, modelo: iModelo.value, etapa: iEtapa.value, origen: iOrigen.value,
        calor: iCalor.value, siguiente: iSig.value.trim(), fechaSig: iFecha.value, enganche: iEng.value, toma: iToma.value.trim(), notas: iNotas.value.trim() });
    }
    function guardar(cerrar) {
      datos();
      if (!l.nombre || !l.asesor) { err.hidden = false; err.textContent = !l.nombre ? "Escribe el nombre del prospecto." : "Elige el vendedor."; return false; }
      if (nuevo) l.creado = Date.now();
      put("leads", l.id || nuevoId(), l);
      nuevo = false;
      if (cerrar !== false) { $("dlg").close(); toast("Prospecto guardado"); render(); }
      return true;
    }
    var foot = [btn("Guardar", function () { guardar(); })];
    var waLink = h("a", { class: "btn wa", target: "_blank", rel: "noopener", text: "WhatsApp" });
    function waHref() { waLink.href = waUrl(iTel.value, "Hola " + (iNombre.value.trim().split(" ")[0] || "") + ", soy " + u.nombre + " de BYD Park Point. "); waLink.hidden = !iTel.value.replace(/\D/g, ""); }
    iTel.addEventListener("input", waHref); iNombre.addEventListener("input", waHref); waHref();
    foot.push(waLink);
    foot.push(btn("Convertir en venta", function () {
      if (!guardar(false)) return;
      dlgVenta(null, { cliente: l.nombre, modelo: l.modelo, asesor: l.asesor });
    }, "line"));
    if (!nuevo) foot.push(h("span", { class: "spacer" }), btn("Borrar", function () { confirmar("¿Borrar prospecto?", "Se borra " + l.nombre + " del CRM.", "Borrar", function () { quitar("leads", l.id); render(); }); }, "danger"));
    abrirDlg(nuevo ? "Nuevo prospecto" : l.nombre, body, foot);
  }

  // ---------- Cotizador ----------
  var cot = { modelo: "king-gl-27", aportacion: 50000, accesorios: 0, garantia: false, plazo: 72, gestoria: false, cliente: "" };
  function vCotizador(page) {
    page.append(cabecera("Vender", "Cotizador", "Fórmulas Banorte Plan Tradicional. El bono flexible solo aplica financiando desde 5% de enganche. Oferta de septiembre 2026: valida la campaña del mes."));
    var form = h("div", { class: "card", style: "display:grid;gap:14px;align-self:start" });
    var out = h("div", { class: "card", style: "display:grid;gap:10px;align-self:start" });
    var iModelo = select("cModelo", MODELOS.map(function (m) { return { v: m.id, t: m.nombre + " " + m.anio + " · " + money(m.precio) }; }), cot.modelo);
    var iCliente = h("input", { type: "text", id: "cCliente", value: cot.cliente, placeholder: "Opcional, para el mensaje" });
    var iAport = h("input", { type: "number", id: "cAport", value: cot.aportacion, min: "0", step: "1000" });
    var iAcc = h("input", { type: "number", id: "cAcc", value: cot.accesorios, min: "0", step: "500" });
    var iPlazo = select("cPlazo", [12, 24, 36, 48, 60, 72].map(function (n) { return { v: String(n), t: n + " meses" }; }), String(cot.plazo));
    var chG = h("label", { class: "chip" }, h("input", { type: "checkbox", id: "cGar", checked: cot.garantia }), h("span", { class: "chk", text: "✓" }), "Garantía extendida financiada (" + money(P.TRAMITES.garantiaExt) + ")");
    var chP = h("label", { class: "chip" }, h("input", { type: "checkbox", id: "cGes", checked: cot.gestoria }), h("span", { class: "chk", text: "✓" }), "Gestoría de placas (" + money(P.TRAMITES.gestoria) + ")");
    var pitch = h("p", { class: "note", style: "margin:0" });
    form.append(campo("Modelo", iModelo), pitch, campo("Cliente", iCliente), h("div", { class: "form" }, campo("Aportación del cliente", iAport), campo("Accesorios", iAcc), campo("Plazo", iPlazo)), h("div", { class: "chips" }, chG, chP));
    function calc() {
      cot = { modelo: iModelo.value, aportacion: Number(iAport.value) || 0, accesorios: Number(iAcc.value) || 0, garantia: chG.querySelector("input").checked, plazo: Number(iPlazo.value), gestoria: chP.querySelector("input").checked, cliente: iCliente.value };
      var m = modeloById(cot.modelo);
      pitch.textContent = (m.motor === "electrico" ? "Eléctrico · " : "Híbrido · ") + m.pitch;
      var placas = m.motor === "electrico" ? P.TRAMITES.placasEvMty : P.TRAMITES.placasHybMty;
      var q = P.cotizar({ modelo: m, aportacion: cot.aportacion, accesorios: cot.accesorios, garantia: cot.garantia ? P.TRAMITES.garantiaExt : 0, plazo: cot.plazo, placas: placas, tramites: cot.gestoria ? P.TRAMITES.gestoria : 0 });
      var nombreCli = cot.cliente.trim().split(" ")[0];
      var wa = (nombreCli ? "Hola " + nombreCli + ", te comparto tu cotización:\n" : "") +
        "🚗 BYD " + m.nombre + " " + m.anio + "\n" +
        "Enganche: " + money(cot.aportacion) + (q.bonoAplica && m.bono ? " + " + money(m.bono) + " de bono = " + money(q.enganche) : "") + "\n" +
        "Mensualidad aprox.: " + money2(q.mensualidad) + " a " + cot.plazo + " meses\n" +
        "Tasa fija anual: " + (q.convenio.tasa * 100).toFixed(2) + "% (Banorte " + q.convenio.label + ")\n" +
        "Pago a la firma aprox.: " + money2(q.firma) + "\n" +
        "Sujeto a autorización de crédito. " + yo().nombre + " · BYD Park Point";
      out.innerHTML = "";
      function fila(k, v) { return h("div", { class: "row", style: "justify-content:space-between;font-size:.9rem" }, h("span", { class: "muted", text: k }), h("span", { class: "tab", text: v })); }
      out.append(h("div", { class: "card-head", style: "margin:0" }, h("h2", { text: "Hoja de números" }), h("span", { class: "pill warn", text: "Borrador" })),
        fila("Precio de lista", money(m.precio)), fila("Bono flexible", q.bonoAplica ? money(m.bono) : "No aplica (menos de 5%)"),
        fila("Enganche (aportación + bono)", money(q.enganche)), fila("% de enganche", (q.pct * 100).toFixed(1) + "%"),
        fila("Convenio", q.convenio.label + " · " + (q.convenio.tasa * 100).toFixed(2) + "%"), fila("Monto a financiar", money2(q.monto)),
        fila("Comisión (× 1.16)", money2(q.comision)), fila("Placas Monterrey", money(placas)),
        h("div", { style: "background:var(--surface-2);border-radius:12px;padding:14px;display:grid;gap:4px" },
          h("span", { class: "hint", text: "Mensualidad" }), h("span", { class: "num", style: "font-size:2.6rem", text: money2(q.mensualidad) }),
          h("span", { class: "hint", text: "Pago a la firma (sin seguro de auto y vida): " + money2(q.firma) })),
        q.pct < 0.4 ? h("p", { class: "hint", style: "margin:0;color:var(--warn)", text: "Enganche menor a 40%. El sistema calcula, pero las condiciones las autoriza el banco." }) : null,
        h("pre", { class: "out", text: wa }),
        h("div", { class: "row" }, btn("Copiar WhatsApp", function () { copiar(wa, "Mensaje copiado"); }), h("a", { class: "btn wa", href: waUrl("", wa), target: "_blank", rel: "noopener", text: "Abrir WhatsApp" })));
    }
    [iModelo, iAport, iAcc, iPlazo, iCliente].forEach(function (i) { i.addEventListener("input", calc); });
    [chG, chP].forEach(function (c) { c.querySelector("input").addEventListener("change", calc); });
    calc();
    page.append(h("div", { class: "grid2" }, form, out));
  }

  // ---------- Guiones ----------
  function vGuiones(page) {
    page.append(cabecera("Vender", "Guiones", "Listos para copiar. Tono humano; cierra a cita o preaprobación."));
    var g = h("div", { class: "grid2" });
    P.GUIONES.forEach(function (x) {
      var t = x.b.replace(/\{n\}/g, yo().rol === "ceo" ? "tu asesor" : yo().nombre);
      g.append(h("div", { class: "card", style: "display:grid;gap:10px;align-content:start" }, h("p", { class: "eyebrow", style: "margin:0", text: x.t }), h("p", { style: "margin:0", text: t }),
        h("div", null, btn("Copiar", function () { copiar(t); }, "line sm"))));
    });
    page.append(g);
  }

  // ---------- Agente IA ----------
  var chat = { hist: [], ocupado: false, error: "" };
  function sistema() {
    var u = yo();
    return "Eres el agente de ventas del portal Park Point para " + (u.rol === "ceo" ? "la dirección" : u.completo + " (" + P.ROLES[u.rol] + ")") + " de " + P.agencia + ", " + P.grupo + ", Monterrey. Gerente: Jorge Cabral. Asesores: Mariana, Leonardo y Omar.\n" +
      "Estilo: humano, breve, directo, español mexicano. Máximo un emoji si es WhatsApp.\n" +
      "Reglas: no inventes precios ni tasas. Catálogo sep-2026 (validar el mes): " + MODELOS.map(function (m) { return m.nombre + " " + m.anio + " " + money(m.precio) + (m.bono ? " bono " + money(m.bono) : ""); }).join("; ") + ".\n" +
      "Bono solo financiando desde 5% de enganche. Convenio Banorte: <20% 14.99%/2.5%; 20% 13.88%; 25% 11.88%; 40% 10.88%; 50% 7.88%; King GL 2027 con 50% 7.18%.\n" +
      "Productos para venta cruzada: garantía extendida $9,082 (6 años, km ilimitado), kit de accesorios $6,500, Cerocible $4,592 (100% factura), seguro de llantas $4,487, gestoría de placas $3,016, seguro de auto y llanta de refacción.\n" +
      "Enganche no es lo mismo que pago a la firma. Nunca prometas autorización de crédito. Recomienda 1 modelo (máximo 2). Prueba de manejo siempre. Seguimiento con razón. Cierre: preaprobación o visita; separación de $5,000 a Accesorios.\n" +
      "Si piden un WhatsApp, entrega el mensaje listo para copiar y corto.";
  }
  function vAgente(page) {
    page.append(cabecera("Vender", "Agente IA", "Pídele mensajes de WhatsApp, respuestas a objeciones, qué modelo ofrecer o la siguiente acción de un prospecto."));
    var log = h("div", { class: "chat" });
    var ta = h("textarea", { id: "agPrompt", placeholder: "Ej. Cliente dice que está caro el Song Plus. Respuesta en 3 líneas.", style: "min-height:90px" });
    var estado = h("p", { class: "hint", style: "margin:0" });
    var enviar = btn("Enviar", function () { mandar(ta.value); });
    function pintar() {
      log.innerHTML = "";
      if (!chat.hist.length) log.append(h("p", { class: "muted", style: "margin:0", text: "Escribe tu pregunta o elige un ejemplo." }));
      chat.hist.forEach(function (m) { log.append(h("div", { class: "msg" + (m.role === "user" ? " me" : "") }, m.content, m.role === "assistant" ? h("div", { style: "margin-top:8px" }, btn("Copiar", function () { copiar(m.content); }, "line sm")) : null)); });
      estado.textContent = chat.ocupado ? "Pensando…" : chat.error;
      enviar.disabled = chat.ocupado;
    }
    function mandar(texto) {
      var t = String(texto || "").trim();
      if (!t || chat.ocupado) return;
      if (!window.claude || typeof window.claude.use !== "function") { chat.error = "El agente funciona al abrir el portal en claude.ai."; pintar(); return; }
      chat.ocupado = true; chat.error = ""; ta.value = "";
      chat.hist.push({ role: "user", content: t });
      var vivo = { role: "assistant", content: "" };
      pintar();
      window.claude.use("sample").then(function (sample) {
        if (!sample) throw { code: "not_granted" };
        var turns = [{ role: "user", content: sistema() + "\n\nResponde a lo siguiente." }, { role: "assistant", content: "Entendido. ¿Qué necesitas?" }]
          .concat(chat.hist.slice(-8).filter(function (m, i, a) { return !(i === 0 && m.role === "assistant") && (m.role === "user" || m.content); }).map(function (m) { return { role: m.role, content: m.content }; }));
        chat.hist.push(vivo);
        return sample(turns, { cache: false, onText: function (u) { vivo.content = u.text; pintar(); } });
      }).then(function (res) {
        vivo.content = res.text; chat.ocupado = false; pintar();
      }, function (e) {
        chat.ocupado = false;
        if (vivo.content === "") chat.hist = chat.hist.filter(function (m) { return m !== vivo; });
        var code = e && e.code;
        chat.error = code === "not_granted" || code === "not_declared" || code === "sampling_disabled" ? "El agente no está disponible en esta vista." :
          code === "rate_limited" ? "Demasiadas preguntas seguidas. Espera un momento." : code === "cancelled" ? "" : "No se pudo responder. Intenta de nuevo.";
        pintar();
      });
    }
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) mandar(ta.value); });
    var presets = ["Redacta un WhatsApp para ofrecer garantía extendida y seguro de llantas a un cliente que ya firmó su King.", "Cliente dice que está caro el Song Plus. Respuesta en 3 líneas.", "¿Qué modelo le ofrezco a un chofer de app que vive en depa sin cochera?", "Siguiente acción para 7 prospectos que cotizaron hace 2 días y no contestan."];
    page.append(h("div", { class: "row" }, presets.map(function (p) { return btn(p.length > 48 ? p.slice(0, 46) + "…" : p, function () { mandar(p); }, "line sm"); })));
    page.append(h("div", { class: "card", style: "display:grid;gap:14px" }, log, ta, h("div", { class: "row" }, enviar, estado)));
    pintar();
  }

  // ---------- Academia ----------
  function progresoAcad(uid) {
    var d = D.academia[uid] || { quiz: {}, exam: {}, examDone: false };
    var mods = AC.modulos.map(function (m) {
      var tot = m.quiz.length, resp = m.quiz.filter(function (q) { return d.quiz[q.id] !== undefined; }).length;
      var bien = m.quiz.filter(function (q) { return d.quiz[q.id] === q.answer; }).length;
      return { id: m.id, tot: tot, resp: resp, bien: bien, ok: resp === tot && tot && bien / tot >= 0.8 };
    });
    var exBien = AC.examen.filter(function (q) { return d.exam[q.id] === q.answer; }).length;
    return { d: d, mods: mods, hechos: mods.filter(function (m) { return m.ok; }).length, examen: d.examDone ? Math.round(exBien / AC.examen.length * 100) : null };
  }
  function responder(tipo, qid, pick) {
    var uid = yo().id;
    var d = clonar(D.academia[uid] || { quiz: {}, exam: {}, examDone: false });
    d[tipo][qid] = pick;
    put("academia", uid, d);
  }
  function vAcademia(page) {
    var pr = progresoAcad(yo().id);
    if (sub === "examen") return vExamen(page, pr);
    var mod = sub && AC.modulos.filter(function (m) { return m.id === sub; })[0];
    if (mod) return vModulo(page, mod, pr);
    page.append(cabecera("Equipo", "Academia BYD", "De 0 a 100: marca, tecnología, catálogo, King, Banorte, proceso, objeciones y examen final. Pasas un módulo con 80% del quiz."));
    page.append(h("div", { class: "card" }, h("div", { class: "card-head" }, h("h2", { text: "Tu avance" }), h("span", { class: "pill acc", text: pr.hechos + " de " + AC.modulos.length + " módulos" })),
      h("div", { class: "track lg" }, h("i", { style: "width:" + (pr.hechos / Math.max(AC.modulos.length, 1) * 100) + "%" }))));
    var l = h("div", { class: "mods" });
    AC.modulos.forEach(function (m, i) {
      var s = pr.mods[i];
      l.append(h("button", { type: "button", class: "mod", onclick: function () { go("academia", m.id); } },
        h("span", { class: "n" + (s.ok ? " ok" : ""), text: s.ok ? "✓" : String(m.n) }),
        h("div", null, h("strong", { text: m.title }), h("div", { class: "hint", text: m.minutes + " min · " + m.goal })),
        h("span", { class: "pill " + (s.ok ? "ok" : s.resp ? "warn" : ""), text: s.resp ? s.bien + "/" + s.tot : "Pendiente" })));
    });
    l.append(h("button", { type: "button", class: "mod", onclick: function () { go("academia", "examen"); } },
      h("span", { class: "n" + (pr.examen != null ? " ok" : ""), text: "★" }),
      h("div", null, h("strong", { text: "Examen final" }), h("div", { class: "hint", text: AC.examen.length + " preguntas de todo el programa" })),
      h("span", { class: "pill " + (pr.examen != null ? (pr.examen >= 80 ? "ok" : "warn") : ""), text: pr.examen != null ? pr.examen + "%" : "Pendiente" })));
    page.append(l);
  }
  function pregunta(q, elegido, onPick) {
    var box = h("div", { class: "q" }, h("strong", { text: q.q }));
    q.options.forEach(function (o, i) {
      var cls = "opt";
      if (elegido !== undefined) { if (i === q.answer) cls += " right"; else if (i === elegido) cls += " wrong"; }
      box.append(h("button", { type: "button", class: cls, text: o, onclick: function () { onPick(i); } }));
    });
    if (elegido !== undefined) box.append(h("p", { class: "hint", style: "margin:0", text: (elegido === q.answer ? "Correcto. " : "No. ") + q.why }));
    return box;
  }
  function vModulo(page, m, pr) {
    page.append(h("div", null, btn("← Academia", function () { go("academia"); }, "line sm")));
    page.append(cabecera("Módulo " + m.n + " · " + m.minutes + " min", m.title, m.goal));
    var les = h("div", { class: "card lesson" });
    m.blocks.forEach(function (b) { les.append(h("div", { style: "display:grid;gap:4px" }, h("h3", { text: b.h }), h("p", { text: b.p }))); });
    page.append(les);
    var qz = h("div", { class: "card", style: "display:grid;gap:20px" }, h("h2", { text: "Quiz" }));
    m.quiz.forEach(function (q) { qz.append(pregunta(q, pr.d.quiz[q.id], function (i) { responder("quiz", q.id, i); render(); })); });
    page.append(qz);
    var idx = AC.modulos.indexOf(m), sig = AC.modulos[idx + 1];
    page.append(h("div", { class: "row" }, sig ? btn("Siguiente: " + sig.title, function () { go("academia", sig.id); }) : btn("Ir al examen final", function () { go("academia", "examen"); })));
  }
  function vExamen(page, pr) {
    page.append(h("div", null, btn("← Academia", function () { go("academia"); }, "line sm")));
    page.append(cabecera("Examen final", "Examen BYD", pr.examen != null ? "Calificación: " + pr.examen + "%. Puedes repasar tus respuestas abajo." : "Contesta todas y toca “Terminar examen” para ver tu calificación."));
    var d = pr.d;
    var box = h("div", { class: "card", style: "display:grid;gap:20px" });
    AC.examen.forEach(function (q) {
      var el = d.exam[q.id];
      if (!d.examDone) {
        var b = h("div", { class: "q" }, h("strong", { text: q.q }));
        q.options.forEach(function (o, i) { b.append(h("button", { type: "button", class: "opt", text: o, style: el === i ? "border-color:var(--fg);box-shadow:inset 0 0 0 1px var(--fg)" : "", onclick: function () { responder("exam", q.id, i); render(); } })); });
        box.append(b);
      } else box.append(pregunta(q, el, function () {}));
    });
    page.append(box);
    var resp = AC.examen.filter(function (q) { return d.exam[q.id] !== undefined; }).length;
    if (!d.examDone) page.append(h("div", { class: "row" }, btn("Terminar examen", function () {
      if (resp < AC.examen.length) { toast("Te faltan " + (AC.examen.length - resp) + " preguntas"); return; }
      var x = clonar(D.academia[yo().id] || d); x.examDone = true; put("academia", yo().id, x, 0); render();
    }), h("span", { class: "hint", text: resp + " de " + AC.examen.length + " contestadas" })));
    else page.append(h("div", { class: "row" }, btn("Repetir examen", function () {
      var x = clonar(D.academia[yo().id] || d); x.exam = {}; x.examDone = false; put("academia", yo().id, x, 0); render();
    }, "line")));
  }

  // ---------- Equipo (dirección) ----------
  function vEquipo(page) {
    var mes = hoy().slice(0, 7);
    var eq = resumen(ventasMes(mes, "todos")), o = objetivos(mes);
    page.append(cabecera("Dirección", "Equipo", "Quién es quién, cómo va cada uno este mes y su sesión en el portal."));
    var t = h("table", { class: "t" });
    t.append(h("thead", null, h("tr", null, h("th", { text: "Usuario" }), h("th", { text: "Rol" }), h("th", { class: "r", text: "Unidades " + MESES[Number(mes.slice(5)) - 1].slice(0, 3) }), h("th", { class: "r", text: "Prod./unidad" }), h("th", { text: "Corte hoy" }), h("th", { text: "Academia" }), h("th", { text: "PIN" }), h("th"))));
    var tb = h("tbody");
    USERS.forEach(function (u) {
      var a = eq.asesores[u.id], pr = progresoAcad(u.id), tiene = !!pins()[u.id];
      tb.append(h("tr", null,
        h("td", null, h("span", { class: "row", style: "flex-wrap:nowrap" }, h("span", { class: "avatar" + (u.rol !== "asesor" ? " boss" : ""), style: "width:30px;height:30px;font-size:.85rem", text: iniciales(u), "data-n": String(iniciales(u).length) }), h("strong", { text: u.rol === "ceo" ? "CEO" : u.completo }))),
        h("td", { text: P.ROLES[u.rol] + (u.rol === "gerente" ? " · vende" : "") }),
        h("td", { class: "r", text: u.vende ? a.n + " / " + o.metas[u.id] : "—" }),
        h("td", { class: "r", text: u.vende && a.n ? (a.prod / a.n).toFixed(1) : "—" }),
        h("td", null, u.vende ? h("span", { class: "pill " + (D.cortes[hoy() + "_" + u.id] ? "ok" : "warn"), text: D.cortes[hoy() + "_" + u.id] ? "Capturado" : "Pendiente" }) : "—"),
        h("td", { text: pr.hechos + "/" + AC.modulos.length + (pr.examen != null ? " · examen " + pr.examen + "%" : "") }),
        h("td", null, h("span", { class: "pill " + (tiene ? "ok" : ""), text: tiene ? "Creado" : "Sin crear" })),
        h("td", { class: "r" }, tiene && u.id !== yo().id ? btn("Restablecer PIN", function () {
          confirmar("¿Restablecer el PIN de " + u.completo + "?", "La próxima vez que entre creará uno nuevo.", "Restablecer", function () { guardarPin(u.id, null); toast("PIN restablecido"); render(); });
        }, "line sm") : null)));
    });
    t.append(tb);
    page.append(h("div", { class: "card", style: "padding:6px 8px" }, h("div", { class: "tablewrap" }, t)));
    page.append(h("div", { class: "note" }, "Los asesores solo ven sus propias ventas, prospectos y cortes; Jorge y el CEO ven todo. El PIN separa las sesiones dentro del equipo; quien tenga acceso al portal en claude.ai puede abrirlo, así que compártelo solo con el equipo."));
  }

  // ---------- Herramientas ----------
  function vHerramientas(page) {
    page.append(cabecera("Equipo", "Herramientas", "Las apps que ya existen para el proceso completo y el respaldo de datos del portal."));
    var g = h("div", { class: "grid2" });
    P.HERRAMIENTAS.forEach(function (x) {
      g.append(h("div", { class: "card", style: "display:grid;gap:8px;align-content:start" }, h("h2", { text: x.t }), h("p", { class: "muted", style: "margin:0", text: x.d }),
        h("div", null, h("a", { class: "btn line sm", href: x.url, target: "_blank", rel: "noopener", text: "Abrir" }))));
    });
    page.append(g);
    var file = h("input", { type: "file", accept: "application/json", hidden: true, onchange: function (e) {
      var f = e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var data = JSON.parse(rd.result), n = 0;
          COLS.forEach(function (c) { Object.keys(data[c] || {}).forEach(function (id) { var cur = D[c][id]; var inc = data[c][id]; if (!cur || (inc.actualizado || 0) > (cur.actualizado || 0)) { D[c][id] = inc; guardarLocal(); programar(c, id, 0); n++; } }); });
          toast(n + " registros restaurados"); render();
        } catch (err) { toast("Ese archivo no es un respaldo del portal."); }
      };
      rd.readAsText(f);
    } });
    page.append(h("div", { class: "card", style: "display:grid;gap:12px" }, h("h2", { text: "Respaldo" }),
      h("p", { class: "muted", style: "margin:0", text: esDireccion() ? "Descarga todo el portal (ventas, prospectos, cortes, metas y academia) o restaura un respaldo." : "Descarga tus datos del portal o restaura un respaldo." }),
      h("div", { class: "row" }, btn("Descargar respaldo", function () {
        var data = {};
        COLS.forEach(function (c) {
          data[c] = {};
          Object.keys(D[c]).forEach(function (id) {
            var d = D[c][id];
            if (c === "config" && id === "pins") return;
            if ((c === "ventas" || c === "leads") && !puedeVer(d.asesor)) return;
            if (c === "cortes" && !puedeVer(d.usuario)) return;
            if (c === "academia" && !puedeVer(id)) return;
            data[c][id] = d;
          });
        });
        guardarArchivo("respaldo-park-point-" + hoy() + ".json", JSON.stringify(data, null, 1));
      }), h("label", { class: "btn line" }, "Restaurar archivo", file))));
  }

  // ---------- Arranque ----------
  var guardada = LS.get(SKEY, null);
  if (guardada && userById(guardada.uid)) { sesion = guardada; abrirShell(); }
  else renderLogin();
  iniciarNube();
})();
