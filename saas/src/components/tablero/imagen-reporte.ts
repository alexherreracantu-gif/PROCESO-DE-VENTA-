/** Dibuja el reporte del mes como imagen PNG (1080 px de ancho, listo para WhatsApp). */

export type DatosImagen = {
  agencia: string;
  grupo: string;
  titulo: string;
  quien: string;
  corte: string;
  generadoPor: string;
  indicadores: { etiqueta: string; valor: string; nota: string }[];
  productos: { etiqueta: string; pct: number; n: number; total: number; meta: number }[];
  ranking: { nombre: string; unidades: number; meta: number; pu: string }[] | null;
  modelos: { etiqueta: string; n: number }[];
  colores: { etiqueta: string; hex: string; n: number }[];
  detalle: { fecha: string; vendedor: string; cliente: string; num: string; vin: string; modelo: string; color: string; hex: string; prod: string }[];
};

const C = { fondo: "#f2f3f6", tarjeta: "#ffffff", tinta: "#11141a", tenue: "#586070", linea: "#dde1e8", barra: "#3157c9", pista: "#e3e7ee", banda: "#0f1217", hueso: "#e9e7e2" };
const DISP = '"Barlow Condensed", "Arial Narrow", sans-serif';
const SANS = '"IBM Plex Sans", "Segoe UI", Arial, sans-serif';

export async function cargarFuentes() {
  if (!document.fonts?.load) return;
  await Promise.all(['700 64px "Barlow Condensed"', '600 40px "Barlow Condensed"', '400 20px "IBM Plex Sans"', '600 20px "IBM Plex Sans"'].map((f) => document.fonts.load(f))).catch(() => {});
}

export function dibujarReporte(d: DatosImagen): HTMLCanvasElement {
  const W = 1080, pad = 56;
  const secH = (n: number) => 90 + n * 52;
  const maxD = 30, detN = Math.min(d.detalle.length, maxD);
  const detH = d.detalle.length ? 130 + detN * 40 + (d.detalle.length > maxD ? 30 : 0) : 0;
  const filasMC = Math.max(d.modelos.length, d.colores.length, 1);
  const H = 480 + secH(d.productos.length) + (d.ranking ? secH(d.ranking.length) : 0) + secH(filasMC) + detH + 60;
  const cv = document.createElement("canvas");
  const esc = 2;
  cv.width = W * esc; cv.height = H * esc;
  const x = cv.getContext("2d")!;
  x.scale(esc, esc);

  const caja = (px: number, py: number, w: number, h: number, r: number, color: string) => {
    x.beginPath();
    if (x.roundRect) x.roundRect(px, py, w, h, r); else x.rect(px, py, w, h);
    x.fillStyle = color; x.fill();
  };
  const txt = (s: string, px: number, py: number, fuente: string, color: string, alinear: CanvasTextAlign = "left") => {
    x.font = fuente; x.fillStyle = color; x.textAlign = alinear; x.textBaseline = "alphabetic"; x.fillText(s, px, py);
  };
  const ajustar = (s: string, ancho: number, fuente: string) => {
    x.font = fuente;
    if (x.measureText(s).width <= ancho) return s;
    let t = s;
    while (t.length > 1 && x.measureText(t + "…").width > ancho) t = t.slice(0, -1);
    return t + "…";
  };
  const punto = (px: number, py: number, r: number, color: string) => {
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fillStyle = color; x.fill(); x.strokeStyle = C.linea; x.lineWidth = 1; x.stroke();
  };

  x.fillStyle = C.fondo; x.fillRect(0, 0, W, H);
  x.fillStyle = C.banda; x.fillRect(0, 0, W, 250);
  txt("PARK POINT", pad, 92, `700 64px ${DISP}`, C.hueso);
  txt(`${d.agencia} · ${d.grupo}`.toUpperCase(), pad, 128, `600 18px ${SANS}`, "#8f96a3");
  txt(d.titulo, pad, 192, `600 44px ${DISP}`, "#ffffff");
  txt(d.quien, pad, 226, `400 22px ${SANS}`, "#c9ccd2");
  txt(d.corte, W - pad, 226, `400 18px ${SANS}`, "#8f96a3", "right");

  let y = 290;
  const tw = (W - pad * 2 - 3 * 16) / 4;
  d.indicadores.slice(0, 4).forEach((t, i) => {
    const tx = pad + i * (tw + 16);
    caja(tx, y, tw, 150, 18, C.tarjeta);
    txt(t.etiqueta, tx + 20, y + 38, `500 18px ${SANS}`, C.tenue);
    txt(t.valor, tx + 20, y + 102, `600 62px ${DISP}`, C.tinta);
    txt(ajustar(t.nota, tw - 40, `400 17px ${SANS}`), tx + 20, y + 132, `400 17px ${SANS}`, C.tenue);
  });
  y += 190;

  const seccion = (titulo: string, nota: string, filas: { l: string; v: number; max: number; m: number | null; t: string }[], anchoValor = 160) => {
    const h = secH(filas.length) - 20;
    caja(pad, y, W - pad * 2, h, 18, C.tarjeta);
    txt(titulo, pad + 24, y + 46, `600 30px ${DISP}`, C.tinta);
    txt(nota, W - pad - 24, y + 44, `400 17px ${SANS}`, C.tenue, "right");
    let fy = y + 84;
    const vx = W - pad - 24, bx = pad + 24 + 260, bw = vx - anchoValor - bx;
    for (const f of filas) {
      txt(ajustar(f.l, 250, `500 20px ${SANS}`), pad + 24, fy, `500 20px ${SANS}`, C.tinta);
      caja(bx, fy - 18, bw, 16, 4, C.pista);
      const w = Math.max(Math.min(f.v / (f.max || 1), 1) * bw, f.v > 0 ? 3 : 0);
      if (w) caja(bx, fy - 18, w, 16, 4, C.barra);
      if (f.m != null) { x.fillStyle = C.tinta; x.fillRect(bx + Math.min(f.m / (f.max || 1), 1) * bw - 1.5, fy - 24, 3, 28); }
      txt(f.t, vx, fy, `600 22px ${SANS}`, C.tinta, "right");
      fy += 52;
    }
    y += h + 20;
  };
  seccion("Penetración por producto", "Barra = real · línea = meta", d.productos.map((p) => ({ l: p.etiqueta, v: p.pct, max: 1, m: p.meta, t: `${Math.round(p.pct * 100)}%  (${p.n}/${p.total})` })));
  if (d.ranking) {
    const maxU = Math.max(1, ...d.ranking.map((r) => Math.max(r.meta, r.unidades)));
    seccion("Ranking de vendedores", "Unidades / meta · productos por unidad", d.ranking.map((r) => ({ l: r.nombre, v: r.unidades, max: maxU, m: r.meta, t: `${r.unidades} / ${r.meta} · ${r.pu} p/u` })), 230);
  }

  const hh = secH(filasMC) - 20, cw = (W - pad * 2 - 20) / 2;
  ([["Unidades por modelo", d.modelos.map((m) => ({ ...m, hex: null as string | null }))], ["Unidades por color", d.colores]] as const).forEach(([titulo, lista], i) => {
    const cx = pad + i * (cw + 20);
    caja(cx, y, cw, hh, 18, C.tarjeta);
    txt(titulo, cx + 24, y + 46, `600 30px ${DISP}`, C.tinta);
    let fy = y + 84;
    const max = lista[0]?.n ?? 1;
    if (!lista.length) txt("Sin datos", cx + 24, fy, `400 20px ${SANS}`, C.tenue);
    for (const f of lista) {
      let lx = cx + 24;
      if (f.hex) { punto(lx + 9, fy - 6, 9, f.hex); lx += 28; }
      txt(ajustar(f.etiqueta, 190 - (lx - cx - 24), `500 19px ${SANS}`), lx, fy, `500 19px ${SANS}`, C.tinta);
      const bx = cx + 220, bw = cw - 220 - 70;
      caja(bx, fy - 17, bw, 14, 4, C.pista);
      caja(bx, fy - 17, Math.max((f.n / max) * bw, 3), 14, 4, C.barra);
      txt(String(f.n), cx + cw - 24, fy, `600 22px ${SANS}`, C.tinta, "right");
      fy += 52;
    }
  });
  y += hh + 20;

  if (d.detalle.length) {
    const h = detH - 20;
    caja(pad, y, W - pad * 2, h, 18, C.tarjeta);
    txt("Detalle de operaciones", pad + 24, y + 46, `600 30px ${DISP}`, C.tinta);
    txt(`${d.detalle.length} unidades`, W - pad - 24, y + 44, `400 17px ${SANS}`, C.tenue, "right");
    const cols: [string, number][] = [["Fecha", 64], ["Vendedor", 104], ["Cliente", 196], ["No. cliente", 104], ["VIN", 112], ["Modelo", 172], ["Color", 106], ["Prod.", 50]];
    const x0 = pad + 24;
    let ty = y + 90, cx = x0;
    for (const [t, w] of cols) { txt(t.toUpperCase(), cx, ty, `600 13px ${SANS}`, C.tenue); cx += w; }
    x.fillStyle = C.linea; x.fillRect(x0, ty + 10, W - pad * 2 - 48, 1);
    ty += 40;
    for (const v of d.detalle.slice(0, maxD)) {
      const vals = [v.fecha, v.vendedor, v.cliente, v.num || "—", v.vin ? "…" + v.vin.slice(-8) : "—", v.modelo, v.color, v.prod];
      cx = x0;
      vals.forEach((val, i) => {
        const off = i === 6 ? 18 : 0;
        if (i === 6) punto(cx + 6, ty - 6, 6, v.hex);
        txt(ajustar(val, cols[i][1] - 10 - off, `400 16px ${SANS}`), cx + off, ty, `${i === 7 ? 600 : 400} 16px ${SANS}`, C.tinta);
        cx += cols[i][1];
      });
      x.fillStyle = C.linea; x.fillRect(x0, ty + 14, W - pad * 2 - 48, 1);
      ty += 40;
    }
    if (d.detalle.length > maxD) txt(`y ${d.detalle.length - maxD} más en el portal`, x0, ty + 4, `400 16px ${SANS}`, C.tenue);
    y += h + 20;
  }
  txt(`Generado por ${d.generadoPor} en el portal Park Point · las ventas canceladas no cuentan`, pad, H - 28, `400 16px ${SANS}`, C.tenue);
  return cv;
}
