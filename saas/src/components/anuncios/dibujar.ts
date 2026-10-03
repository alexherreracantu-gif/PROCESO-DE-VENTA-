/**
 * Dibuja los anuncios en un canvas (1080 px de ancho), con el estilo de los anuncios de BYD Grupo TEC:
 * fondo azul, logo arriba al centro, pestañas blancas con el bono y el modelo, franja con tasa y
 * mensualidad, "BUILD YOUR DREAMS" y letra chica.
 */

export type Estilo = "bono" | "mensualidad" | "centrado";
export type Formato = "cuadrado" | "vertical" | "historia";

export const FORMATOS: Record<Formato, { alto: number; etiqueta: string; uso: string }> = {
  cuadrado: { alto: 1080, etiqueta: "Cuadrado 1:1", uso: "Feed de Facebook e Instagram" },
  vertical: { alto: 1350, etiqueta: "Vertical 4:5", uso: "Feed (ocupa más pantalla)" },
  historia: { alto: 1920, etiqueta: "Historia 9:16", uso: "Historias, Reels y estado de WhatsApp" },
};

export type DatosLienzo = {
  modelo: string;          // "KING GL DM-i"
  anio: number;
  subtitulo: string;       // "COMB. 1,680 KM*"
  kicker: string;          // "TOTALMENTE NUEVO" (estilo mensualidad)
  precio: number;
  bono: number | null;     // null = no mostrar
  mensualidad: number | null;
  tasa: number | null;
  enganche: number | null; // 0.5
  extra: string;           // "O HASTA 36 MSI*"
  contacto: { nombre: string; telefono: string } | null;
  legal: string;
};

export type Recursos = { logo: HTMLImageElement | null };

const W = 1080;
const ANCHO = '"Michroma", "Arial Black", "Helvetica Neue", sans-serif';
const SANS = '"IBM Plex Sans", "Segoe UI", Arial, sans-serif';
const AZUL = "#1590e0", AZUL_OSCURO = "#0b4f9e", AZUL_TEXTO = "#0f7fd0", CIELO = "#2aa7f2";

/** Carga la tipografía ancha y el logo antes de dibujar. */
export async function cargarRecursosAnuncio(): Promise<Recursos> {
  const fuentes = document.fonts?.load
    ? Promise.all(['400 40px "Michroma"', '600 20px "IBM Plex Sans"', '700 20px "IBM Plex Sans"'].map((f) => document.fonts.load(f))).catch(() => {})
    : Promise.resolve();
  const logo = cargarImagen("/marca/byd-grupo-tec-blanco.png").catch(() => null);
  const [, l] = await Promise.all([fuentes, logo]);
  return { logo: l };
}

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => ok(img);
    img.onerror = () => mal(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

const dinero = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const pct = (n: number) => `${(n * 100).toFixed(2).replace(/\.?0+$/, "")}%`;

export function dibujarAnuncio(d: DatosLienzo, foto: HTMLImageElement, r: Recursos, estilo: Estilo, formato: Formato): HTMLCanvasElement {
  const H = FORMATOS[formato].alto;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d")!;
  // Zonas seguras: en historias, la interfaz de Instagram tapa arriba y abajo.
  const arriba = formato === "historia" ? 190 : 52;
  const abajo = formato === "historia" ? 250 : 40;
  const k = new Lienzo(x, H);

  if (estilo === "bono") {
    k.degradado(0, 0, 0, H, [[0, "#1a93e4"], [0.55, "#0e63bd"], [1, "#083f8c"]]);
    k.fondoFoto(foto, H * 0.56);
    k.degradado(0, 0, 0, H * 0.34, [[0, "rgba(16,128,222,0.82)"], [1, "rgba(16,128,222,0)"]]);
    k.degradado(0, H * 0.5, 0, H, [[0, "rgba(8,60,140,0)"], [0.55, "rgba(8,62,142,0.82)"], [1, "rgba(6,40,100,0.96)"]]);
    k.logo(r.logo, arriba, 300);

    // Pestaña blanca con el bono (o el precio)
    const yTab = arriba + (formato === "cuadrado" ? 110 : 150);
    const conBono = d.bono !== null;
    const etiqueta = conBono ? "BONO FLEXIBLE:" : "PRECIO DESDE:";
    const valor = conBono ? `${dinero(d.bono!)}*` : `${dinero(d.precio)}*`;
    const tamValor = k.ajustar(valor, ANCHO, 470, 86, 40);
    const anchoTab = Math.max(k.medir(etiqueta, `30px ${ANCHO}`, 2), k.medir(valor, `${tamValor}px ${ANCHO}`)) + 130;
    k.sombra(() => k.caja(-40, yTab, anchoTab + 40, 70 + tamValor * 1.25, [0, 30, 90, 0], "#ffffff"));
    k.texto(etiqueta, 64, yTab + 62, `30px ${ANCHO}`, AZUL_TEXTO, "left", 2);
    k.texto(valor, 64, yTab + 62 + tamValor * 1.12, `${tamValor}px ${ANCHO}`, AZUL, "left", 0, true);

    // De abajo hacia arriba: letra chica, contacto, eslogan, franja de financiamiento
    let y = H - abajo;
    y = k.legal(d.legal, y, formato) - 18;
    if (d.contacto) y = k.contacto(d.contacto, y) - 22;
    y = k.eslogan(y) - 30;

    const filas: { texto: string; resaltado?: boolean }[] = [];
    if (d.tasa !== null) filas.push({ texto: `TASA DEL ${pct(d.tasa)}*` });
    if (d.mensualidad !== null) filas.push({ texto: `MENSUALIDADES DESDE: ${dinero(d.mensualidad)}*`, resaltado: true });
    else if (conBono) filas.push({ texto: `PRECIO: ${dinero(d.precio)}*`, resaltado: true });
    if (d.extra.trim()) filas.push({ texto: d.extra.trim().toUpperCase() });
    const altoFila = 66, anchoFranja = 640;
    const yFranja = y - filas.length * altoFila - 20;
    if (filas.length) {
      k.caja(-40, yFranja, anchoFranja + 40, filas.length * altoFila + 20, [0, 26, 26, 0], "rgba(7,38,92,0.62)");
      filas.forEach((f, i) => {
        const yf = yFranja + 10 + i * altoFila;
        if (f.resaltado) k.caja(-40, yf + 6, anchoFranja + 20, altoFila - 12, [0, 14, 14, 0], CIELO);
        const tam = k.ajustar(f.texto, ANCHO, anchoFranja - 110, f.resaltado ? 25 : 30, 16);
        k.texto(f.texto, 64, yf + altoFila / 2 + tam * 0.38, `${tam}px ${ANCHO}`, "#ffffff", "left", 1, f.resaltado);
      });
    }
    // Pestaña del modelo, a la derecha
    const nombre = `${d.modelo} ${d.anio}`.toUpperCase();
    const tamNom = k.ajustar(nombre, ANCHO, 400, 34, 18);
    const anchoMod = Math.max(k.medir(nombre, `${tamNom}px ${ANCHO}`), d.subtitulo ? k.medir(d.subtitulo, `18px ${ANCHO}`) : 0) + 90;
    const altoMod = d.subtitulo ? 104 : 80;
    const yMod = filas.length ? yFranja + (filas.length * altoFila + 20) / 2 - altoMod / 2 + 10 : y - altoMod - 10;
    k.sombra(() => k.caja(W - anchoMod, yMod, anchoMod + 40, altoMod, [26, 0, 0, 26], "#ffffff"));
    k.texto(nombre, W - anchoMod / 2, yMod + (d.subtitulo ? 50 : 52), `${tamNom}px ${ANCHO}`, AZUL_TEXTO, "center", 0, true);
    if (d.subtitulo) k.texto(d.subtitulo.toUpperCase(), W - anchoMod / 2, yMod + 84, `18px ${ANCHO}`, AZUL, "center", 1);
  }

  if (estilo === "mensualidad") {
    k.degradado(0, 0, 0, H, [[0, "#121c28"], [1, "#05080d"]]);
    k.fondoFoto(foto, H * 0.58);
    k.relleno("rgba(5,12,22,0.30)");
    k.degradado(0, 0, 0, H * 0.45, [[0, "rgba(5,12,22,0.85)"], [1, "rgba(5,12,22,0)"]]);
    k.degradado(0, H * 0.55, 0, H, [[0, "rgba(5,12,22,0)"], [1, "rgba(5,12,22,0.92)"]]);
    k.logo(r.logo, arriba, 280);
    let y = arriba + 280 * 0.32 + 72;
    if (d.kicker.trim()) {
      const kick = d.kicker.trim().toUpperCase();
      k.texto(kick, W / 2, y, `28px ${ANCHO}`, "#ffffff", "center", 2);
      const ak = k.medir(kick, `28px ${ANCHO}`, 2);
      k.caja(W / 2 - ak / 2, y + 16, ak, 2, 0, "rgba(255,255,255,0.7)");
      y += 92;
    } else y += 40;
    const nombre = `BYD ${d.modelo}`.toUpperCase();
    const tamNom = k.ajustar(nombre, ANCHO, W - 140, 76, 34);
    k.texto(nombre, W / 2, y, `${tamNom}px ${ANCHO}`, "#ffffff", "center", 1, true);
    y += 50;

    // Pestaña azul con la mensualidad (o el precio)
    const etiqueta = d.mensualidad !== null ? "MENSUALIDADES DESDE:" : "PRECIO DESDE:";
    const valor = `${dinero(d.mensualidad ?? d.precio)}*`;
    const tamValor = k.ajustar(valor, ANCHO, 560, 104, 50);
    const anchoTab = Math.max(k.medir(valor, `${tamValor}px ${ANCHO}`), k.medir(etiqueta, `24px ${ANCHO}`, 2)) + 140;
    k.sombra(() => k.caja(-40, y, anchoTab + 40, 84 + tamValor * 1.1, [0, 34, 34, 0], gradiente(x, 0, y, anchoTab, y, [[0, "#1f8fe0"], [1, CIELO]])));
    k.texto(etiqueta, 64, y + 52, `24px ${ANCHO}`, "#ffffff", "left", 2);
    k.texto(valor, 60, y + 52 + tamValor * 1.08, `${tamValor}px ${ANCHO}`, "#ffffff", "left", 0, true);

    let yb = H - abajo;
    yb = k.legal(d.legal, yb, formato) - 18;
    if (d.contacto) yb = k.contacto(d.contacto, yb) - 22;
    yb = k.eslogan(yb) - 34;
    const cajas: [string, string][] = [];
    if (d.bono !== null) cajas.push(["BONO FLEXIBLE", `${dinero(d.bono)}*`]);
    if (d.tasa !== null) cajas.push(["TASA DESDE:", `${pct(d.tasa)}*`]);
    if (d.enganche !== null) cajas.push(["ENGANCHE DESDE:", `${Math.round(d.enganche * 100)}%`]);
    if (d.mensualidad !== null) cajas.push(["PRECIO:", `${dinero(d.precio)}*`]);
    k.cajasValor(cajas.slice(0, 3), yb - 130, 130, "relleno");
  }

  if (estilo === "centrado") {
    const fondo = x.createRadialGradient(W / 2, H * 0.36, 40, W / 2, H * 0.45, H * 0.85);
    fondo.addColorStop(0, "#5fd0ff"); fondo.addColorStop(0.35, "#1c9cf0"); fondo.addColorStop(0.75, "#0d6fd0"); fondo.addColorStop(1, "#0a4ea6");
    x.fillStyle = fondo; x.fillRect(0, 0, W, H);
    k.destello(H * 0.56);
    k.logo(r.logo, arriba, 280);
    const nombre = `BYD ${d.modelo}`.toUpperCase();
    const tamNom = k.ajustar(nombre, ANCHO, W - 150, 70, 30);
    const yNom = arriba + (formato === "historia" ? 210 : 165);
    k.texto(nombre, W / 2, yNom, `${tamNom}px ${ANCHO}`, "#ffffff", "center", 2, true);
    if (d.subtitulo) k.texto(d.subtitulo.toUpperCase(), W / 2, yNom + 46, `20px ${ANCHO}`, "rgba(255,255,255,0.85)", "center", 2);

    let yb = H - abajo;
    yb = k.legal(d.legal, yb, formato) - 18;
    if (d.contacto) yb = k.contacto(d.contacto, yb) - 22;
    yb = k.eslogan(yb) - 34;
    const cajas: [string, string][] = [];
    if (d.mensualidad !== null) cajas.push(["MENSUALIDADES DESDE:", `${dinero(d.mensualidad)}*`]);
    else cajas.push(["PRECIO DESDE:", `${dinero(d.precio)}*`]);
    if (d.bono !== null) cajas.push(["BONO FLEXIBLE:", `${dinero(d.bono)}*`]);
    if (d.tasa !== null) cajas.push(["TASA DESDE:", `${pct(d.tasa)}*`]);
    const altoCajas = 150;
    const yCajas = yb - altoCajas;
    k.cajasValor(cajas, yCajas, altoCajas, "corchetes");

    // Foto entre el nombre y los recuadros, fundida con el fondo
    const top = yNom + (d.subtitulo ? 70 : 40), bottom = yCajas - 16;
    const natural = W / (foto.naturalWidth / foto.naturalHeight);
    const alto = Math.min(bottom - top, natural * 1.35);
    k.fotoFundida(foto, top + (bottom - top - alto) / 2, alto);
  }
  return cv;
}

function gradiente(x: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, paradas: [number, string][]) {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  for (const [p, c] of paradas) g.addColorStop(p, c);
  return g;
}

/** Utilidades de dibujo sobre un contexto de 1080 px de ancho. */
class Lienzo {
  constructor(private x: CanvasRenderingContext2D, private H: number) {}

  ruta(px: number, py: number, w: number, h: number, r: number | number[]) {
    this.x.beginPath();
    if (this.x.roundRect) this.x.roundRect(px, py, w, h, r); else this.x.rect(px, py, w, h);
  }
  caja(px: number, py: number, w: number, h: number, r: number | number[], color: string | CanvasGradient) {
    this.ruta(px, py, w, h, r); this.x.fillStyle = color; this.x.fill();
  }
  relleno(color: string) { this.x.fillStyle = color; this.x.fillRect(0, 0, W, this.H); }
  degradado(x0: number, y0: number, x1: number, y1: number, paradas: [number, string][]) {
    this.x.fillStyle = gradiente(this.x, x0, y0, x1, y1, paradas); this.x.fillRect(0, 0, W, this.H);
  }
  sombra(dibujar: () => void, desenfoque = 30) {
    this.x.save(); this.x.shadowColor = "rgba(0,20,60,0.35)"; this.x.shadowBlur = desenfoque; this.x.shadowOffsetY = 10; dibujar(); this.x.restore();
  }
  espaciado(px: number) {
    const c = this.x as CanvasRenderingContext2D & { letterSpacing?: string };
    if ("letterSpacing" in c) c.letterSpacing = `${px}px`;
  }
  medir(s: string, fuente: string, espacio = 0) {
    this.x.font = fuente; this.espaciado(espacio);
    const w = this.x.measureText(s).width; this.espaciado(0); return w;
  }
  /** Tamaño de letra más grande (≤ max) con el que `s` cabe en `ancho`. */
  ajustar(s: string, familia: string, ancho: number, max: number, min: number) {
    let t = max;
    while (t > min && this.medir(s, `${t}px ${familia}`) > ancho) t -= 2;
    return t;
  }
  texto(s: string, px: number, py: number, fuente: string, color: string, alinear: CanvasTextAlign = "left", espacio = 0, grueso = false) {
    if (fuente.includes("Michroma") && s.includes("%")) { this.textoConPorcentaje(s, px, py, fuente, color, alinear, espacio, grueso); return; }
    const x = this.x;
    x.font = fuente; x.fillStyle = color; x.textAlign = alinear; x.textBaseline = "alphabetic"; this.espaciado(espacio);
    if (grueso) { x.lineJoin = "round"; x.lineWidth = Math.max(1.5, parseFloat(fuente) * 0.045); x.strokeStyle = color; x.strokeText(s, px, py); }
    x.fillText(s, px, py);
    this.espaciado(0);
  }
  /** Texto en Michroma con el "%" en otra tipografía. */
  private textoConPorcentaje(s: string, px: number, py: number, fuente: string, color: string, alinear: CanvasTextAlign, espacio: number, grueso: boolean) {
    const tam = parseFloat(fuente);
    const fuentePct = `700 ${Math.round(tam * 1.08)}px ${SANS}`;
    const partes = s.split(/(%)/).filter(Boolean).map((t) => ({ t, f: t === "%" ? fuentePct : fuente }));
    const anchos = partes.map((p) => this.medir(p.t, p.f, p.t === "%" ? 0 : espacio));
    const total = anchos.reduce((a, b) => a + b, 0);
    let cx = alinear === "center" ? px - total / 2 : alinear === "right" || alinear === "end" ? px - total : px;
    partes.forEach((p, i) => {
      if (p.t === "%") { this.x.font = p.f; this.x.fillStyle = color; this.x.textAlign = "left"; this.espaciado(0); this.x.fillText("%", cx, py); }
      else this.texto(p.t, cx, py, p.f, color, "left", espacio, grueso);
      cx += anchos[i];
    });
  }
  /** Foto que llena el área; si la proporción es muy distinta, fondo difuminado y la foto completa encima. */
  foto(img: HTMLImageElement, px: number, py: number, w: number, h: number) {
    const x = this.x, iw = img.naturalWidth, ih = img.naturalHeight;
    const cubrir = () => {
      const k = Math.max(w / iw, h / ih), sw = w / k, sh = h / k;
      x.drawImage(img, (iw - sw) / 2, Math.max(0, (ih - sh) * 0.55), sw, sh, px, py, w, h);
    };
    const proporcion = (iw / ih) / (w / h);
    if (proporcion < 1.45 && proporcion > 0.69) { cubrir(); return; }
    x.save(); x.filter = "blur(36px) brightness(0.8)"; cubrir(); x.restore();
    const k = Math.min(w / iw, h / ih), dw = iw * k, dh = ih * k;
    x.drawImage(img, px + (w - dw) / 2, py + (h - dh) * 0.55, dw, dh);
  }
  /**
   * Foto de fondo a todo lo ancho. Si su proporción es parecida a la del anuncio, lo cubre completo;
   * si no (foto horizontal en historia o vertical), va fundida con el fondo alrededor de `centro`.
   */
  fondoFoto(img: HTMLImageElement, centro: number) {
    const a = img.naturalWidth / img.naturalHeight;
    if (a / (W / this.H) <= 1.8) { this.foto(img, 0, 0, W, this.H); return; }
    const alto = Math.min(this.H * 0.82, (W / a) * 1.6);
    this.fotoFundida(img, Math.max(0, Math.min(this.H - alto, centro - alto / 2)), alto);
  }
  /** Foto a todo lo ancho entre `y` y `y + alto` (recortada al centro), con orillas que se desvanecen. */
  fotoFundida(img: HTMLImageElement, y: number, alto: number) {
    const off = document.createElement("canvas");
    off.width = W; off.height = Math.max(1, Math.round(alto));
    const o = off.getContext("2d")!;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const k = Math.max(W / iw, alto / ih), sw = W / k, sh = alto / k;
    o.drawImage(img, (iw - sw) / 2, (ih - sh) * 0.55, sw, sh, 0, 0, W, alto);
    o.globalCompositeOperation = "destination-in";
    const g = o.createLinearGradient(0, 0, 0, alto);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.16, "rgba(0,0,0,1)"); g.addColorStop(0.8, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = g; o.fillRect(0, 0, W, alto);
    this.x.drawImage(off, 0, y);
  }
  logo(logo: HTMLImageElement | null, y: number, ancho: number) {
    if (logo) this.x.drawImage(logo, (W - ancho) / 2, y, ancho, (ancho * logo.naturalHeight) / logo.naturalWidth);
    else this.texto("BYD | GRUPO TEC", W / 2, y + 50, `34px ${ANCHO}`, "#ffffff", "center", 2);
  }
  destello(y: number) {
    const x = this.x;
    for (const [dy, a, grosor] of [[0, 0.9, 3], [24, 0.45, 2], [-30, 0.35, 2]] as const) {
      const g = x.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, `rgba(255,255,255,${a})`); g.addColorStop(1, "rgba(255,255,255,0)");
      x.save(); x.shadowColor = "#8fe0ff"; x.shadowBlur = 24; x.fillStyle = g;
      x.beginPath(); x.ellipse(W / 2, y + dy, W * 0.62, grosor, -0.03, 0, Math.PI * 2); x.fill(); x.restore();
    }
  }
  /** Letra chica centrada; devuelve la y donde empieza. */
  legal(t: string, yFinal: number, formato: Formato) {
    // Nunca se corta: si no cabe en las líneas disponibles, baja el tamaño.
    const maxLineas = formato === "historia" ? 9 : formato === "vertical" ? 7 : 6;
    let tam = formato === "historia" ? 17 : 14, fuente = "", lineas: string[] = [];
    for (; tam >= 9; tam -= 1) {
      fuente = `600 ${tam}px ${SANS}`;
      lineas = envolver(this.x, t.toUpperCase(), W - 150, fuente, 99);
      if (lineas.length <= maxLineas) break;
    }
    const alto = tam * 1.35;
    const y0 = yFinal - lineas.length * alto;
    lineas.forEach((l, i) => this.texto(l, W / 2, y0 + (i + 1) * alto - 4, fuente, "rgba(255,255,255,0.82)", "center"));
    return y0;
  }
  eslogan(yFinal: number) {
    this.texto("BUILD YOUR DREAMS", W / 2, yFinal, `22px ${ANCHO}`, "rgba(255,255,255,0.88)", "center", 8);
    return yFinal - 22;
  }
  /** Píldora con el asesor y su WhatsApp. */
  contacto(c: { nombre: string; telefono: string }, yFinal: number) {
    const texto = [c.nombre && c.nombre.toUpperCase(), c.telefono && `WHATSAPP ${c.telefono}`].filter(Boolean).join("   ·   ");
    const fuente = `700 24px ${SANS}`;
    const ancho = this.medir(texto, fuente, 1) + 96, alto = 56;
    const px = (W - ancho) / 2, py = yFinal - alto;
    this.caja(px, py, ancho, alto, 28, "rgba(255,255,255,0.95)");
    this.x.beginPath(); this.x.arc(px + 34, py + alto / 2, 11, 0, Math.PI * 2); this.x.fillStyle = "#25d366"; this.x.fill();
    this.texto(texto, px + 58, py + 37, fuente, AZUL_OSCURO, "left", 1);
    return py;
  }
  /** Recuadros con etiqueta y valor: "relleno" (azul con borde) o "corchetes" ([ ] como en los anuncios). */
  cajasValor(cajas: [string, string][], y: number, alto: number, tipo: "relleno" | "corchetes") {
    if (!cajas.length) return;
    const sep = 22, margen = 70;
    const pesos = cajas.map((_, i) => (tipo === "corchetes" && i === 0 && cajas.length > 1 ? 1.5 : 1));
    const total = pesos.reduce((a, b) => a + b, 0);
    const util = W - margen * 2 - sep * (cajas.length - 1);
    let px = margen;
    cajas.forEach(([etq, val], i) => {
      const w = (util * pesos[i]) / total;
      if (tipo === "relleno") {
        this.caja(px, y, w, alto, 6, "rgba(29,147,224,0.95)");
        this.ruta(px + 7, y + 7, w - 14, alto - 14, 3); this.x.lineWidth = 2; this.x.strokeStyle = "rgba(255,255,255,0.9)"; this.x.stroke();
      } else {
        const b = 18;
        this.x.lineWidth = 3; this.x.strokeStyle = "rgba(255,255,255,0.85)";
        this.x.beginPath(); this.x.moveTo(px + b, y); this.x.lineTo(px, y); this.x.lineTo(px, y + alto); this.x.lineTo(px + b, y + alto); this.x.stroke();
        this.x.beginPath(); this.x.moveTo(px + w - b, y); this.x.lineTo(px + w, y); this.x.lineTo(px + w, y + alto); this.x.lineTo(px + w - b, y + alto); this.x.stroke();
      }
      const tamE = this.ajustar(etq, SANS, w - 36, 22, 13);
      this.texto(etq, px + w / 2, y + alto * 0.36, `700 ${tamE}px ${SANS}`, "#ffffff", "center", 1);
      const tamV = this.ajustar(val, ANCHO, w - 40, tipo === "corchetes" && i === 0 && cajas.length > 1 ? 54 : 40, 18);
      this.texto(val, px + w / 2, y + alto * 0.36 + tamV + 16, `${tamV}px ${ANCHO}`, "#ffffff", "center", 0, true);
      px += w + sep;
    });
  }
}

function envolver(x: CanvasRenderingContext2D, texto: string, ancho: number, fuente: string, max = 99): string[] {
  x.font = fuente;
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (x.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = p; } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  if (lineas.length > max) { lineas.length = max; lineas[max - 1] = lineas[max - 1].replace(/\s*\S*$/, "…"); }
  return lineas;
}
