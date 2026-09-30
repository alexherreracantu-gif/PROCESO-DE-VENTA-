/*
 * App de expedientes: tablero de clientes, expediente guiado paso a paso y sección Aprende.
 * Los pasos, campos y mensajes se definen en assets/pasos.js.
 *
 * Guardado: siempre en este navegador. Si la página corre dentro de claude.ai, además se
 * sincroniza con el espacio privado de tu cuenta (se ve igual en el celular y en la compu).
 */
(function () {
  var C = window.CONFIG || {};
  var A = C.asesor || {};
  var P = window.PROCESO;
  var PASOS = P.PASOS;
  var KEY = "expedientes.v1";
  var app = document.getElementById("app");
  var $ = function (id) { return document.getElementById(id); };

  // ---------- Utilidades ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  function h(tag, props) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
      else if (k in node && k !== "list") node[k] = v;
      else node.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) { if (x != null && x !== false) node.append(x.nodeType ? x : document.createTextNode(String(x))); });
    }
    return node;
  }
  function toast(t) {
    var el = $("toast");
    el.textContent = t; el.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }
  function copy(text, msg) {
    try {
      navigator.clipboard.writeText(text).then(function () { toast(msg || "Copiado"); }, function () { fallbackCopy(text, msg); });
    } catch (e) { fallbackCopy(text, msg); }
  }
  function fallbackCopy(text, msg) {
    var ta = h("textarea", { value: text, style: "position:fixed;top:0;opacity:0" });
    document.body.append(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    toast(ok ? (msg || "Copiado") : "No se pudo copiar: selecciona el texto y cópialo a mano");
  }
  function waUrl(tel, text) {
    var t = String(tel || "").replace(/\D/g, "");
    if (t.length === 10) t = "521" + t;
    return "https://wa.me/" + t + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function hoyISO() { return new Date().toISOString().slice(0, 10); }
  function fecha(ts) { return new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "short" }); }
  function diasSin(e) { return Math.floor((Date.now() - (e.actualizado || e.creado)) / 864e5); }
  function nombre(e) { return P.nombreCompleto(e) || "Cliente sin nombre"; }
  function clonar(o) { return JSON.parse(JSON.stringify(o)); }
  function nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  $("hdrAsesor").textContent = [A.nombre, A.ciudad].filter(Boolean).join(" · ");

  // ---------- Datos ----------
  var exps = store.get(KEY, []);
  function guardarLocal() { store.set(KEY, exps); }
  function save(e) { guardarLocal(); if (e) programar(e); }
  function byId(id) { return exps.filter(function (e) { return e.id === id; })[0]; }
  function touch(e) { e.actualizado = Date.now(); }
  function borrar(e) {
    exps = exps.filter(function (x) { return x.id !== e.id; });
    guardarLocal(); borrarNube(e.id);
  }
  function aplica(e, i) { var s = PASOS[i]; return !(s.omitir && s.omitir(e)); }
  function pasoActual(e) {
    for (var i = 0; i < PASOS.length; i++) if (aplica(e, i) && !(e.hechos || {})[PASOS[i].id]) return i;
    return -1;
  }
  function progreso(e) {
    var total = 0, hechos = 0;
    PASOS.forEach(function (s, i) { if (aplica(e, i)) { total++; if ((e.hechos || {})[s.id]) hechos++; } });
    return { total: total, hechos: hechos, pct: total ? Math.round(hechos / total * 100) : 0 };
  }
  function entregado(e) { return pasoActual(e) === -1; }
  function valorDe(f, e) { return typeof f.label === "function" ? f.label(e) : f.label; }
  function visible(f, e) { return !f.show || f.show(e); }
  function aplicarDefaults(e, paso) {
    paso.campos.forEach(function (f) {
      if (f.def === undefined || e[f.id] !== undefined || !visible(f, e)) return;
      e[f.id] = typeof f.def === "function" ? f.def(e) : f.def;
    });
    if (e.modelo && P.vacio(e.valorFactura)) {
      var m = (C.modelos || []).filter(function (x) { return x.nombre === e.modelo; })[0];
      if (m && m.precio) e.valorFactura = String(m.precio);
    }
  }

  // ---------- Sincronización con tu cuenta (solo dentro de claude.ai) ----------
  var nube = { col: null, estado: "local", conocidos: {}, ultimo: {}, pendientes: {}, cadena: {} };
  function pintarSync() {
    var el = $("syncState");
    var txt = { local: "Guardado en este dispositivo", nube: "Guardado en tu cuenta", error: "Sin conexión con tu cuenta · guardado en este dispositivo" }[nube.estado];
    el.textContent = txt;
    el.className = "sync " + nube.estado;
  }
  function programar(e, espera) {
    if (!nube.col) return;
    var id = e.id;
    clearTimeout(nube.pendientes[id]);
    nube.pendientes[id] = setTimeout(function () { escribir(id); }, espera == null ? 700 : espera);
  }
  function escribir(id) {
    var e = byId(id);
    if (!e) { delete nube.pendientes[id]; return; }
    var json = JSON.stringify(e);
    if (json === nube.ultimo[id]) { delete nube.pendientes[id]; return; }
    nube.cadena[id] = (nube.cadena[id] || Promise.resolve()).then(function () {
      return nube.col.doc(id).set(JSON.parse(json));
    }).then(function () {
      nube.ultimo[id] = json; nube.conocidos[id] = true;
      if (nube.estado !== "nube") { nube.estado = "nube"; pintarSync(); }
    }, function (err) {
      nube.estado = "error"; pintarSync();
      if (err && err.code === "quota_exceeded") toast("Tu espacio en la cuenta está lleno. Borra expedientes viejos.");
    }).then(function () { delete nube.pendientes[id]; });
  }
  function borrarNube(id) {
    if (!nube.col) return;
    clearTimeout(nube.pendientes[id]);
    nube.pendientes[id] = true;
    nube.cadena[id] = (nube.cadena[id] || Promise.resolve()).then(function () { return nube.col.doc(id).delete(); })
      .catch(function () { nube.estado = "error"; pintarSync(); })
      .then(function () { delete nube.pendientes[id]; delete nube.conocidos[id]; delete nube.ultimo[id]; });
  }
  function iniciarNube() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (r) {
      var db = r[0], user = r[1];
      if (!db || !user) return null;
      return user.id().then(function (uid) {
        if (!uid) return;
        nube.col = db.collection("data/users/" + uid);
        var primero = true;
        nube.col.onSnapshot(function (snap) {
          var server = {};
          snap.docs.forEach(function (d) { if (d.exists) server[d.id] = d.data(); });
          var cambiados = {};
          Object.keys(server).forEach(function (id) {
            nube.conocidos[id] = true;
            var s = server[id], loc = byId(id);
            if (!loc) { exps.push(clonar(s)); cambiados[id] = true; }
            else if ((s.actualizado || 0) > (loc.actualizado || 0) && !nube.pendientes[id]) {
              exps[exps.indexOf(loc)] = clonar(s); cambiados[id] = true;
            }
            if (!nube.ultimo[id] && byId(id) && (byId(id).actualizado || 0) === (s.actualizado || 0)) nube.ultimo[id] = JSON.stringify(byId(id));
          });
          var antes = exps.length;
          exps = exps.filter(function (e) {
            var fuera = nube.conocidos[e.id] && !server[e.id] && !nube.pendientes[e.id] && !primero;
            if (fuera) { cambiados[e.id] = true; delete nube.conocidos[e.id]; }
            return !fuera;
          });
          if (primero) {
            primero = false;
            exps.forEach(function (e) { if (!server[e.id]) programar(e, 0); });
            nube.estado = "nube"; pintarSync();
          }
          if (Object.keys(cambiados).length || antes !== exps.length) {
            guardarLocal();
            refrescarPorNube(cambiados);
          }
        }, function () { nube.estado = "error"; pintarSync(); });
      });
    }).catch(function () { nube.estado = "error"; pintarSync(); });
  }
  function refrescarPorNube(cambiados) {
    var r = ruta.split("/");
    if (r[1] === "c") {
      if (!cambiados[r[2]]) return;
      if (!byId(r[2])) { toast("Este expediente se borró en otro dispositivo"); go("/"); return; }
      toast("Actualizado desde otro dispositivo");
    }
    render();
  }

  // ---------- Navegación ----------
  var ruta = "/";
  function go(r) { ruta = r; window.scrollTo(0, 0); render(); }
  function render() {
    var parts = ruta.split("/");
    var seccion = parts[1] === "aprende" ? "/aprende" : "/";
    document.querySelectorAll("[data-go]").forEach(function (a) {
      if (a.dataset.go === seccion) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (parts[1] === "c" && byId(parts[2])) return viewExpediente(byId(parts[2]), parts[3]);
    if (parts[1] === "aprende") return viewAprende();
    ruta = "/"; viewTablero();
  }
  document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.go); }); });
  function link(texto, destino, cls) { return h("button", { type: "button", class: cls || "btn ghost", text: texto, onclick: function () { go(destino); } }); }

  // ---------- Confirmación dentro de la página ----------
  var confirmFn = null;
  function confirmar(titulo, texto, boton, fn) {
    $("cfTitle").textContent = titulo;
    $("cfText").textContent = texto;
    $("cfOk").textContent = boton;
    confirmFn = fn;
    $("dlgConfirm").showModal();
  }
  $("cfOk").addEventListener("click", function () { $("dlgConfirm").close(); var f = confirmFn; confirmFn = null; if (f) f(); });

  // ---------- Tablero ----------
  var filtro = store.get("expedientes.filtro", "activos");
  var busqueda = "";
  function viewTablero() {
    app.innerHTML = "";
    var activos = exps.filter(function (e) { return !entregado(e); });
    var enPaso = function (ids) { return activos.filter(function (e) { var i = pasoActual(e); return i >= 0 && ids.indexOf(PASOS[i].id) >= 0; }).length; };
    var mes = new Date().toISOString().slice(0, 7);
    var entregadosMes = exps.filter(function (e) { return entregado(e) && String((e.hechos || {}).entrega || "").slice(0, 7) === mes; }).length;

    app.append(
      h("div", { class: "row", style: "margin-bottom:16px" },
        h("div", { style: "min-width:0" }, h("h1", { text: "Mis clientes" }), h("p", { class: "sub", style: "margin:0", text: "Da de alta al cliente y la app te lleva paso a paso hasta la entrega." })),
        h("span", { class: "spacer" }),
        h("button", { class: "btn lg", text: "+ Nuevo cliente", onclick: nuevo }),
        h("button", { class: "btn ghost", text: "Respaldo", onclick: function () { $("dlgBackup").showModal(); } })
      ),
      h("div", { class: "stats" },
        stat(activos.length, "En proceso"),
        stat(enPaso(["documentos", "aprobacion"]), "Esperando al banco"),
        stat(enPaso(["separacion", "quiter", "caja", "firma"]), "Por separar o firmar"),
        stat(enPaso(["desembolso", "cuadre"]), "Esperando desembolso"),
        stat(entregadosMes, "Entregados este mes")
      )
    );

    var list = h("div", { class: "clients" });
    var filtros = h("div", { class: "filters" });
    [["activos", "En proceso"], ["entregados", "Entregados"], ["todos", "Todos"]].forEach(function (f) {
      filtros.append(h("button", { text: f[1], "aria-pressed": String(filtro === f[0]), onclick: function () { filtro = f[0]; store.set("expedientes.filtro", filtro); viewTablero(); } }));
    });
    var buscar = h("input", { type: "text", id: "buscar", placeholder: "Buscar cliente, modelo o número de cliente", value: busqueda, style: "max-width:340px",
      oninput: function () { busqueda = buscar.value; pintar(); } });
    app.append(h("div", { class: "row", style: "margin-bottom:14px" }, filtros, h("span", { class: "spacer" }), buscar), list);

    function pintar() {
      list.innerHTML = "";
      var q = busqueda.trim().toLowerCase();
      var items = exps.filter(function (e) {
        if (filtro === "activos" && entregado(e)) return false;
        if (filtro === "entregados" && !entregado(e)) return false;
        return !q || [nombre(e), e.modelo, e.numeroCliente, e.telefono].join(" ").toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) { return (a.actualizado || 0) - (b.actualizado || 0); });
      if (!items.length) {
        if (exps.length) { list.append(h("div", { class: "empty" }, "No hay clientes en este filtro.")); return; }
        list.append(h("div", { class: "empty" },
          h("p", { style: "margin:0 0 6px;font-weight:700;color:var(--text)", text: "Aún no tienes clientes" }),
          h("p", { style: "margin:0 0 16px", text: "Empieza con tu primer cliente, o abre un ejemplo ya avanzado (King de $499,800) para ver cómo funciona cada paso." }),
          h("div", { class: "row", style: "justify-content:center" },
            h("button", { class: "btn", text: "+ Nuevo cliente", onclick: nuevo }),
            h("button", { class: "btn ghost", text: "Ver cliente de ejemplo", onclick: cargarEjemplo }))));
        return;
      }
      items.forEach(function (e) { list.append(tarjeta(e)); });
    }
    pintar();
  }
  function stat(v, t) { return h("div", { class: "stat" }, h("b", { text: String(v) }), h("span", { text: t })); }

  function tarjeta(e) {
    var i = pasoActual(e), pr = progreso(e), d = diasSin(e);
    var paso = i >= 0 ? PASOS[i] : null;
    return h("article", { class: "client" },
      h("div", {},
        h("div", { class: "name", text: nombre(e) }),
        h("div", { style: "margin:4px 0" },
          e.ejemplo ? h("span", { class: "tag warn", text: "Ejemplo" }) : null,
          e.plaza === "PN" ? h("span", { class: "tag pn", text: "Piedras Negras" }) : h("span", { class: "tag", text: "Monterrey" }),
          e.formaPago ? h("span", { class: "tag", text: e.formaPago }) : null,
          !paso ? h("span", { class: "tag ok", text: "Entregado" }) : d >= 2 && !e.ejemplo ? h("span", { class: "tag warn", text: "Sin movimiento hace " + d + " días" }) : null
        ),
        h("div", { class: "meta", text: [e.modelo, e.valorFactura ? P.money(e.valorFactura) : "", e.numeroCliente ? "Cliente #" + e.numeroCliente : ""].filter(Boolean).join(" · ") })
      ),
      h("div", {},
        h("div", { class: "row", style: "justify-content:space-between;font-size:.8rem;color:var(--muted);margin-bottom:4px" },
          h("span", { text: pr.hechos + " de " + pr.total + " pasos" }), h("span", { text: pr.pct + " %" })),
        h("div", { class: "bar" }, h("i", { style: "width:" + pr.pct + "%" }))
      ),
      paso ? h("div", { class: "next" }, h("b", { text: "Paso " + (i + 1) + " · " + paso.titulo }), paso.objetivo) : null,
      h("div", { class: "row" },
        link(paso ? "Continuar →" : "Ver expediente", "/c/" + e.id, "btn sm"),
        e.telefono && !e.ejemplo ? h("a", { class: "btn wa sm", href: waUrl(e.telefono, "Hola " + (e.nombre || "") + ", "), target: "_blank", rel: "noopener", text: "WhatsApp" }) : null
      )
    );
  }

  function nuevo() {
    var e = { id: nuevoId(), creado: Date.now(), actualizado: Date.now(), hechos: {}, log: [{ t: Date.now(), txt: "Expediente creado" }] };
    exps.push(e); save(e);
    go("/c/" + e.id);
  }

  function cargarEjemplo() {
    var hoy = hoyISO();
    var hechos = {};
    ["cliente", "cotizacion", "documentos", "aprobacion", "separacion", "quiter", "caja"].forEach(function (k) { hechos[k] = hoy; });
    var e = {
      id: nuevoId(), creado: Date.now(), actualizado: Date.now(), ejemplo: true, hechos: hechos,
      log: [{ t: Date.now(), txt: "Cliente de ejemplo creado: avanzado hasta la separación en caja" }],
      nombre: "Juan (ejemplo)", apPaterno: "Pérez", apMaterno: "López", telefono: "", origen: "Anuncio Meta", plaza: "MTY",
      modelo: "BYD King", version: "GS", colorExterior: "Blanco", colorInterior: "Café", valorFactura: "499800", formaPago: "Crédito",
      engancheDeseado: "100000", plazoDeseado: "48", fechaCotizacion: hoy, cotizacionEnviada: true,
      banco: "BBVA", fechaEnvioBanco: hoy, docINE: true, docDomicilio: true, docIngresos: true, enviadoBanco: true,
      estatusCredito: "Aprobado", fechaAprobacion: hoy, engancheAprobado: "100000", montoFinanciado: "349800", plazoMeses: "48",
      montoSeparacion: "5000", fechaSeparacion: hoy, separacionRecibida: true, comprobanteImpreso: true,
      nombreComercial: "Juan Pérez López", calle: "Calle Ejemplo 123", cp: "67100", colonia: "Centro", delegacion: "Guadalupe",
      estado: "Nuevo León", pais: "México", fechaNacimiento: "1990-01-01", idioma: "Español", tipoIdentificacion: "INE",
      folioINE: "EJEMPLO", curp: "EJEMPLO00000000000", rfc: "EJEMPLO000000", numeroCliente: "EJEMPLO-001",
      formatoEntregado: true, folioRecibo: "EJ-1", reciboAplicado: true, reflejadoQuiter: true,
      engancheTotal: "100000", bonosAgencia: "50000", bonoFronteraModo: "monto", bonoFrontera: "25000",
      exGarantia: "10000", exKit: "11000",
    };
    exps.push(e); save(e);
    toast("Ejemplo listo: estás en el paso 8, Enganche y firma");
    go("/c/" + e.id);
  }

  // ---------- Expediente ----------
  function viewExpediente(e, stepId) {
    e.hechos = e.hechos || {}; e.log = e.log || [];
    var idx = PASOS.findIndex(function (s) { return s.id === stepId; });
    if (idx < 0) idx = pasoActual(e);
    app.innerHTML = "";
    var pr = progreso(e);

    var head = h("div", { class: "exp-head" },
      h("div", { style: "flex:1;min-width:0" },
        link("← Mis clientes", "/", "linkbtn"),
        h("h1", { id: "expName", text: nombre(e), style: "margin-top:4px" }),
        h("div", { class: "row", style: "gap:10px" },
          e.ejemplo ? h("span", { class: "tag warn", text: "Ejemplo" }) : null,
          h("div", { class: "bar", style: "width:180px;max-width:50%" }, h("i", { id: "expBar", style: "width:" + pr.pct + "%" })),
          h("span", { id: "expProg", class: "hint", style: "margin:0", text: pr.hechos + " de " + pr.total + " pasos" }))
      ),
      e.telefono && !e.ejemplo ? h("a", { class: "btn wa sm", href: waUrl(e.telefono, ""), target: "_blank", rel: "noopener", text: "WhatsApp" }) : null,
      h("button", { class: "btn danger sm", text: "Borrar", onclick: function () {
        confirmar("Borrar expediente", "Se borra el expediente de " + nombre(e) + " de este dispositivo y de tu cuenta. No se puede deshacer.", "Borrar", function () {
          borrar(e); toast("Expediente borrado"); go("/");
        });
      } })
    );
    var stepper = h("nav", { class: "stepper", "aria-label": "Pasos del proceso" });
    var content = h("div", { style: "min-width:0" });
    app.append(head, h("div", { class: "exp" }, stepper, content));

    function pintarStepper() {
      stepper.innerHTML = "";
      var actual = pasoActual(e);
      PASOS.forEach(function (s, i) {
        var cls = !aplica(e, i) ? "skip" : e.hechos[s.id] ? "done" : i === actual ? "current" : "";
        stepper.append(h("button", { type: "button", class: cls, "aria-current": i === idx ? "step" : null, title: !aplica(e, i) ? "No aplica" : s.titulo,
          onclick: function () { go("/c/" + e.id + "/" + s.id); } },
          h("span", { class: "dot", text: e.hechos[s.id] ? "✓" : String(i + 1) }), h("span", { class: "t", text: s.titulo })));
      });
      var p = progreso(e);
      $("expBar").style.width = p.pct + "%";
      $("expProg").textContent = p.hechos + " de " + p.total + " pasos";
      $("expName").textContent = nombre(e);
    }
    pintarStepper();
    requestAnimationFrame(function () {
      var cur = stepper.querySelector('[aria-current="step"]');
      if (cur && stepper.scrollWidth > stepper.clientWidth) {
        stepper.scrollLeft += cur.getBoundingClientRect().left - stepper.getBoundingClientRect().left - 16;
      }
    });

    if (idx < 0) { content.append(resumenFinal(e)); return; }
    var paso = PASOS[idx];
    var antes = JSON.stringify(e);
    aplicarDefaults(e, paso);
    if (JSON.stringify(e) !== antes) save(e);

    var card = h("div", { class: "card" });
    content.append(card);
    if (!aplica(e, idx)) card.append(h("div", { class: "done-banner muted", text: "Este paso no aplica para ventas de contado." }));
    else if (e.hechos[paso.id]) card.append(h("div", { class: "done-banner", text: "✓ Paso completado el " + new Date(e.hechos[paso.id] + "T12:00:00").toLocaleDateString("es-MX") + ". Puedes corregir los datos." }));
    card.append(
      h("div", { class: "eyebrow", text: "Paso " + (idx + 1) + " de " + PASOS.length }),
      h("h2", { text: paso.titulo }),
      h("p", { class: "objetivo", text: paso.objetivo })
    );
    var coach = h("details", { class: "coach", open: store.get("expedientes.coach", true), ontoggle: function () { store.set("expedientes.coach", coach.open); } },
      h("summary", { text: "¿Cómo se hace este paso?" }),
      h("ul", {}, paso.coach.map(function (t) { return h("li", { text: t }); })));
    card.append(coach);

    var fields = h("div", { class: "fields" });
    var refs = [];
    paso.campos.forEach(function (f) { var r = campo(f, e); refs.push({ f: f, node: r }); fields.append(r); });
    card.append(fields);

    function refrescar() {
      refs.forEach(function (r) {
        r.node.hidden = !visible(r.f, e);
        var lab = r.node.querySelector("[data-label]");
        if (lab && typeof r.f.label === "function") lab.textContent = r.f.label(e);
        if (r.f.type === "calc") {
          var v = r.node.querySelector(".calcv");
          v.textContent = r.f.fn(e);
          v.className = "calcv" + (r.f.tone ? " " + (r.f.tone(e) || "") : "");
        }
        if (r.f.type === "ledger") r.node.replaceChildren(ledger(e));
      });
      pintarStepper();
    }
    fields.addEventListener("cambio", refrescar);
    refrescar();

    var acciones = (paso.acciones || []).filter(function (a) { return !a.show || a.show(e); });
    if (acciones.length) {
      card.append(h("div", { class: "actions" }, acciones.map(function (a) {
        return h("button", { type: "button", class: "btn " + (a.tipo === "wa" ? "wa" : "ghost"), text: a.label, onclick: function () { accion(a, e); } });
      })));
    }

    var errores = h("div", { role: "alert" });
    card.append(errores);
    var anterior = prevIdx(e, idx), siguiente = nextIdx(e, idx);
    card.append(h("div", { class: "footer-step" },
      anterior >= 0 ? link("← Anterior", "/c/" + e.id + "/" + PASOS[anterior].id) : null,
      h("span", { class: "spacer" }),
      aplica(e, idx) ? h("button", { type: "button", class: "btn lg", text: e.hechos[paso.id] ? "Guardar y seguir →" : "Completar paso →", onclick: completar })
        : siguiente >= 0 ? link("Siguiente →", "/c/" + e.id + "/" + PASOS[siguiente].id, "btn") : null
    ));

    content.append(h("details", { class: "card", style: "margin-top:16px" },
      h("summary", { style: "font-weight:700;cursor:pointer", text: "Bitácora del expediente" }),
      h("ul", { class: "log", style: "margin-top:10px" }, e.log.slice().reverse().map(function (l) { return h("li", {}, h("b", { text: fecha(l.t) + " · " }), l.txt); }))));

    function completar() {
      var faltan = [];
      refs.forEach(function (r) {
        r.node.classList.remove("missing");
        var f = r.f;
        if (!f.req || !visible(f, e)) return;
        var vacio = f.type === "check" ? !e[f.id] : P.vacio(e[f.id]) || String(e[f.id]).trim() === "";
        if (vacio) { faltan.push(valorDe(f, e)); r.node.classList.add("missing"); }
      });
      var err = paso.validar && paso.validar(e);
      errores.innerHTML = "";
      if (faltan.length || err) {
        errores.append(h("div", { class: "errors" },
          faltan.length ? "Te falta completar:" : err,
          faltan.length ? h("ul", {}, faltan.map(function (t) { return h("li", { text: t }); }).concat(err ? [h("li", { text: err })] : [])) : null));
        errores.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      if (!e.hechos[paso.id]) {
        e.hechos[paso.id] = hoyISO();
        e.log.push({ t: Date.now(), txt: "Completado: " + paso.titulo });
      }
      touch(e); save(e);
      var sig = pasoActual(e);
      if (sig === -1) { toast("¡Venta completada!"); go("/c/" + e.id + "/fin"); }
      else { toast("Listo: " + paso.titulo); go("/c/" + e.id + "/" + PASOS[sig].id); }
    }
  }
  function prevIdx(e, i) { for (var j = i - 1; j >= 0; j--) if (aplica(e, j)) return j; return -1; }
  function nextIdx(e, i) { for (var j = i + 1; j < PASOS.length; j++) if (aplica(e, j)) return j; return -1; }

  function campo(f, e) {
    var wrap = h("div", { class: "f" + (f.full || f.type === "check" || f.type === "textarea" ? " full" : "") });
    var inputId = "f_" + f.id;
    if (f.type === "ledger") return wrap;
    if (f.type === "check") {
      var cb = h("input", { type: "checkbox", id: inputId, checked: !!e[f.id], onchange: function () { set(cb.checked); } });
      wrap.append(h("label", { class: "checkline", for: inputId }, cb, h("span", { "data-label": "", text: valorDe(f, e) }), f.req ? h("span", { class: "req", text: "*" }) : null));
      if (f.hint) wrap.append(h("div", { class: "hint", text: f.hint }));
      return wrap;
    }
    wrap.append(h("label", { class: "l", for: inputId }, h("span", { "data-label": "", text: valorDe(f, e) }), f.req ? h("span", { class: "req", text: "*" }) : null));
    if (f.type === "calc") {
      var box = h("div", { class: "inp" }, h("div", { class: "calcv", style: "flex:1", id: inputId }));
      if (f.copyValue) box.append(copyBtn(function () { return f.copyValue; }));
      wrap.append(box);
      return wrap;
    }
    var input;
    if (f.type === "select") {
      input = h("select", { id: inputId });
      f.opts.forEach(function (o) {
        var val = Array.isArray(o) ? o[0] : o, txt = Array.isArray(o) ? o[1] : (o === "" ? "Selecciona…" : o);
        input.append(h("option", { value: val, text: txt }));
      });
      if (!P.vacio(e[f.id]) && !f.opts.some(function (o) { return (Array.isArray(o) ? o[0] : o) === e[f.id]; })) input.append(h("option", { value: e[f.id], text: e[f.id] }));
      input.value = P.vacio(e[f.id]) ? (Array.isArray(f.opts[0]) ? f.opts[0][0] : f.opts[0]) : e[f.id];
      if (P.vacio(e[f.id]) && input.value !== "") e[f.id] = input.value;
      input.addEventListener("change", function () { set(input.value); });
    } else if (f.type === "textarea") {
      input = h("textarea", { id: inputId, value: e[f.id] || "" });
      input.addEventListener("input", function () { set(input.value); });
    } else {
      var type = f.type === "money" ? "number" : (f.type || "text");
      input = h("input", { id: inputId, type: type, value: P.vacio(e[f.id]) ? "" : e[f.id] });
      if (f.type === "money") { input.min = "0"; input.step = "0.01"; input.inputMode = "decimal"; input.placeholder = "$"; }
      if (f.type === "tel") input.inputMode = "tel";
      if (f.upper) input.style.textTransform = "uppercase";
      input.addEventListener("input", function () {
        if (f.upper && input.value !== input.value.toUpperCase()) input.value = input.value.toUpperCase();
        set(input.value);
      });
    }
    var line = h("div", { class: "inp" }, input);
    if (f.copy) line.append(copyBtn(function () { return e[f.id] || ""; }));
    wrap.append(line);
    if (f.hint) wrap.append(h("div", { class: "hint", text: f.hint }));
    return wrap;

    function set(v) {
      e[f.id] = v;
      if (f.id === "modelo" && P.vacio(e.valorFactura)) {
        var m = (C.modelos || []).filter(function (x) { return x.nombre === v; })[0];
        if (m && m.precio) { e.valorFactura = String(m.precio); var vf = $("f_valorFactura"); if (vf) vf.value = m.precio; }
      }
      touch(e); save(e);
      wrap.classList.remove("missing");
      wrap.dispatchEvent(new CustomEvent("cambio", { bubbles: true }));
    }
  }
  function copyBtn(get) {
    return h("button", { type: "button", class: "btn ghost sm copy", text: "Copiar", onclick: function () {
      var v = String(get() || "");
      if (!v) { toast("Campo vacío"); return; }
      copy(v, "Copiado: " + (v.length > 30 ? v.slice(0, 30) + "…" : v));
    } });
  }

  function ledger(e) {
    var c = P.calc, m = P.money;
    var rows = [
      ["Valor factura", m(e.valorFactura)],
      ["Extras vendidos (nota)", m(c.extras(e))],
      ["Total a cubrir", m(c.cargos(e)), true],
      [e.formaPago === "Contado" ? "Pago del cliente (incluye separación)" : "Enganche (incluye separación)", m(c.enganche(e))],
      ["Bonos (agencia + frontera)", m(c.bonos(e))],
    ];
    if (e.formaPago !== "Contado") rows.push(["Desembolso del banco" + (P.vacio(e.desembolsoReal) ? " (esperado)" : ""), m(c.desembolso(e))]);
    rows.push(["Pagos adicionales", m(e.pagoAdicional)], ["Total cubierto", m(c.cubierto(e)), true]);
    var det = c.extrasDetalle(e);
    return h("div", {},
      h("table", { class: "ledger" }, rows.map(function (r) { return h("tr", { class: r[2] ? "t" : "" }, h("td", {}, r[2] ? h("b", { text: r[0] }) : r[0]), h("td", { text: r[1] })); })),
      det.length ? h("div", { class: "hint", text: "Extras: " + det.join(" · ") }) : null);
  }

  function resumenFinal(e) {
    var c = P.calc, v = P.veredicto(e);
    return h("div", { class: "card" },
      h("div", { class: "done-banner", text: "Venta completada y entregada" }),
      h("h2", { text: nombre(e) }),
      h("p", { class: "sub", text: [e.modelo, e.version, e.colorExterior].filter(Boolean).join(" · ") }),
      ledger(e),
      h("div", { class: "calcv " + v.tone, style: "margin-top:12px", text: v.text }),
      h("div", { class: "actions" },
        e.telefono ? h("button", { type: "button", class: "btn wa", text: "WhatsApp: reseña y referidos", onclick: function () { accion({ tipo: "wa", tpl: "resena", label: "Reseña y referidos" }, e); } }) : null,
        h("button", { type: "button", class: "btn ghost", text: "Borrar datos personales", onclick: function () {
          confirmar("Borrar datos personales", "Se borran CURP, RFC, folio de INE, fecha de nacimiento y domicilio. Se conservan el nombre, el teléfono y los datos de la venta.", "Borrar datos", function () {
            ["curp", "rfc", "folioINE", "fechaNacimiento", "calle", "portal", "cp", "localidad", "colonia"].forEach(function (k) { delete e[k]; });
            e.log.push({ t: Date.now(), txt: "Datos personales borrados" }); touch(e); save(e); toast("Datos personales borrados");
          });
        } })
      ),
      h("p", { class: "hint", text: "Separación aplicada: " + P.money(c.separacion(e)) + (e.numeroCliente ? " · Cliente Quiter #" + e.numeroCliente : "") })
    );
  }

  // ---------- Acciones: WhatsApp, correo, formato de caja, Quiter ----------
  var msg = { e: null, tipo: null, log: "" };
  function actualizarEnlace() {
    var t = $("msgText").value, go = $("msgGo");
    if (msg.tipo === "wa") go.href = waUrl(msg.e.telefono, t);
    else if (msg.tipo === "correo") {
      var lineas = t.split("\n"), asunto = "";
      if (/^Asunto:/.test(lineas[0])) { asunto = lineas.shift().replace(/^Asunto:\s*/, ""); if (lineas[0] === "") lineas.shift(); }
      go.href = "mailto:" + encodeURIComponent($("msgTo").value) + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(lineas.join("\n"));
    }
  }
  $("msgText").addEventListener("input", actualizarEnlace);
  $("msgTo").addEventListener("input", actualizarEnlace);
  $("msgGo").addEventListener("click", function () {
    if (msg.e && msg.log) { msg.e.log.push({ t: Date.now(), txt: msg.log }); touch(msg.e); save(msg.e); }
  });
  $("msgCopy").addEventListener("click", function () { copy($("msgText").value); });
  $("msgCopyTo").addEventListener("click", function () { copy($("msgTo").value, "Correo copiado"); });
  function abrirMensaje(o) {
    msg = { e: o.e, tipo: o.tipo, log: o.log || "" };
    $("msgTitle").textContent = o.titulo;
    $("msgText").value = o.texto;
    $("msgHelp").textContent = o.ayuda || "Puedes editar el texto antes de enviarlo.";
    $("msgPara").hidden = o.tipo !== "correo";
    $("msgTo").value = o.para || "";
    var go = $("msgGo");
    go.hidden = !o.boton;
    go.textContent = o.boton || "";
    go.className = "btn" + (o.tipo === "wa" ? " wa" : "");
    actualizarEnlace();
    $("dlgMsg").showModal();
  }
  function accion(a, e) {
    if (a.tipo === "wa") {
      if (String(e.telefono || "").replace(/\D/g, "").length < 10) { toast(e.ejemplo ? "El cliente de ejemplo no tiene WhatsApp; así se ve el mensaje:" : "Captura el WhatsApp del cliente en el paso 1"); if (!e.ejemplo) return; }
      abrirMensaje({ e: e, tipo: "wa", titulo: a.label, texto: P.PLANTILLAS[a.tpl](e), boton: e.telefono ? "Abrir en WhatsApp" : "", log: "WhatsApp: " + a.label.replace(/^WhatsApp: /, "") });
    } else if (a.tipo === "correo") {
      var c = P.correoPN(e, a.que);
      abrirMensaje({ e: e, tipo: "correo", titulo: "Correo a Piedras Negras", texto: "Asunto: " + c.asunto + "\n\n" + c.cuerpo, para: c.para, boton: "Abrir en correo",
        ayuda: "Si tu correo no se abre, copia el texto y pégalo en un correo nuevo. Adjunta el comprobante del pago negativo y el recibo.",
        log: "Correo Piedras Negras (" + a.que + ")" });
    } else if (a.tipo === "imprimir") {
      var fm = P.formatoCaja(e, a.que);
      var ancho = fm.filas.reduce(function (m, r) { return Math.max(m, r[0].length); }, 0);
      var texto = fm.titulo.toUpperCase() + "\n\n" + fm.filas.map(function (r) { return (r[0] + ":").padEnd(ancho + 2, " ") + r[1]; }).join("\n") + "\n\n" + fm.nota;
      abrirMensaje({ e: e, tipo: "formato", titulo: "Formato de caja", texto: texto, ayuda: "Copia estos datos al formato físico de caja, o pégalos en un documento para imprimir." });
    } else if (a.tipo === "copiarQuiter") {
      var paso = PASOS.filter(function (s) { return s.id === "quiter"; })[0];
      var lines = paso.campos.filter(function (f) { return f.copy || f.copyValue; }).map(function (f) { return valorDe(f, e) + ": " + (f.copyValue || e[f.id] || ""); });
      copy(lines.join("\n"), "Datos para Quiter copiados");
    }
  }

  // ---------- Aprende ----------
  function viewAprende() {
    app.innerHTML = "";
    var resp = store.get("expedientes.pendientes", {});
    app.append(
      h("h1", { text: "Aprende el proceso" }),
      h("p", { class: "sub", text: "Los 11 pasos de una venta, qué lograr en cada uno y cómo hacerlo. Es la misma guía que ves dentro de cada expediente." }),
      h("div", { class: "card rules" },
        h("h3", { text: "Reglas de oro" }),
        h("ul", {},
          h("li", { text: "No pidas la separación hasta que el banco apruebe el crédito." }),
          h("li", { text: "La separación es parte del enganche y siempre va a Accesorios." }),
          h("li", { text: "Nunca puede quedar adeudo: si falta aunque sea $1, el carro no sale. Si sobra, queda como saldo a favor." }),
          h("li", { text: "No apliques un pago a factura si no sabes a dónde va: cancelarlo tarda 2 o 3 días." }),
          h("li", { text: "Antes de cerrar pregúntate: ¿qué le vendí? y ¿qué le di?" }))),
      h("div", { class: "learn" }, PASOS.map(function (s, i) {
        return h("div", { class: "card" },
          h("h3", {}, h("span", { class: "num", text: String(i + 1) }), s.titulo, s.omitir ? h("span", { class: "tag", text: "Solo crédito" }) : null),
          h("p", { style: "margin:0 0 8px;font-weight:600", text: s.objetivo }),
          h("ul", {}, s.coach.map(function (t) { return h("li", { text: t }); })));
      })),
      h("h2", { style: "margin-top:28px", text: "Pendientes por validar con tu capacitador" }),
      h("p", { class: "sub", text: "Anota la respuesta cuando la tengas. Estas notas se guardan en este dispositivo." }),
      h("div", { class: "pend" }, P.PENDIENTES.map(function (q, i) {
        var lab = h("label", { for: "pend" + i, text: (resp[i] ? "✓ " : "") + q });
        var ta = h("textarea", { id: "pend" + i, value: resp[i] || "", placeholder: "Respuesta…", style: "min-height:60px",
          oninput: function () { resp[i] = ta.value; store.set("expedientes.pendientes", resp); lab.textContent = (ta.value ? "✓ " : "") + q; } });
        return h("div", { class: "card" }, lab, ta);
      }))
    );
  }

  // ---------- Respaldo ----------
  function descargar(nombreArchivo, contenido, tipo) {
    var usar = window.claude && typeof window.claude.use === "function" ? window.claude.use("downloads") : Promise.resolve(null);
    usar.then(function (dl) {
      if (dl) return dl.save({ filename: nombreArchivo, data: contenido }).then(function () { toast("Archivo guardado"); }, function (err) {
        if (err && err.code !== "declined") toast("No se pudo guardar el archivo");
      });
      var a = h("a", { href: URL.createObjectURL(new Blob([contenido], { type: tipo })), download: nombreArchivo });
      document.body.append(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }
  $("bkDown").addEventListener("click", function () { descargar("respaldo-expedientes-" + hoyISO() + ".json", JSON.stringify(exps, null, 2), "application/json"); });
  $("bkCsv").addEventListener("click", function () {
    var cols = [["Cliente", nombre], ["WhatsApp", "telefono"], ["Plaza", function (e) { return e.plaza === "PN" ? "Piedras Negras" : "Monterrey"; }], ["Forma de pago", "formaPago"],
      ["Modelo", "modelo"], ["Valor factura", "valorFactura"], ["Número de cliente", "numeroCliente"], ["Banco", "banco"],
      ["Paso actual", function (e) { var i = pasoActual(e); return i < 0 ? "Entregado" : PASOS[i].titulo; }],
      ["Saldo", function (e) { return P.calc.saldo(e); }], ["Creado", function (e) { return new Date(e.creado).toLocaleDateString("es-MX"); }]];
    var rows = [cols.map(function (c) { return c[0]; })].concat(exps.map(function (e) {
      return cols.map(function (c) { return typeof c[1] === "function" ? c[1](e) : (e[c[1]] == null ? "" : e[c[1]]); });
    }));
    descargar("expedientes.csv", "﻿" + rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(","); }).join("\n"), "text/csv");
  });
  $("bkFile").addEventListener("change", function (ev) {
    var f = ev.target.files[0]; if (!f) return;
    f.text().then(function (txt) {
      var data = JSON.parse(txt);
      if (!Array.isArray(data)) throw new Error("formato");
      var n = 0;
      data.forEach(function (e) { if (e && e.id && !byId(e.id)) { exps.push(e); save(e); n++; } });
      toast(n + " expedientes restaurados"); $("dlgBackup").close(); go("/");
    }).catch(function () { toast("El archivo no es un respaldo válido"); });
    ev.target.value = "";
  });

  pintarSync();
  render();
  iniciarNube();
})();
