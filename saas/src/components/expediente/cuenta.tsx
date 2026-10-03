"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { Boton, Campo, cx, Pastilla, Tabla } from "@/components/ui";
import { Confirmar, Dialogo, useAviso } from "@/components/cliente";
import { borrarMovimiento, cargosDeProductos, guardarMovimiento, guardarValorFactura, type EntradaMovimiento } from "@/app/(portal)/ventas/expediente";
import { CARGOS, FORMAS_COBRO, labelCargo, labelOrigen, ORIGENES, ORIGENES_CON_RECIBO, type DatosCredito, type Movimiento, type ResultadoCuenta } from "@/lib/dominio/cuenta";
import { fechaCorta, hoy } from "@/lib/dominio/fechas";
import { dinero2 } from "@/lib/dominio/formato";
import type { DocumentoResumen } from "@/lib/dominio/proceso";
import { BotonSubir, ChipArchivo, FormEnlace } from "./proceso";

type Props = {
  ventaId: string;
  valorFactura: number | null;
  movimientos: Movimiento[];
  documentos: DocumentoResumen[];
  cuenta: ResultadoCuenta;
  credito: DatosCredito | null;
  contado: boolean;
  faltanCargos: boolean;
  separacionDefault: number;
};

type Borrador = { id?: string; tipo: "cargo" | "pago"; concepto: string; aplica_a: string; monto: string; fecha: string; forma: string; referencia: string; notas: string };

function FormMovimiento({ ventaId, inicial, alCerrar }: { ventaId: string; inicial: Borrador; alCerrar: () => void }) {
  const router = useRouter();
  const avisar = useAviso();
  const [f, setF] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const set = (k: keyof Borrador) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const pago = f.tipo === "pago";
  const guardar = () => iniciar(async () => {
    const entrada: EntradaMovimiento = {
      id: f.id ?? null, ventaId, tipo: f.tipo, concepto: f.concepto, aplica_a: pago ? f.aplica_a : null,
      monto: f.monto.trim() === "" ? Number.NaN : Number(f.monto), fecha: f.fecha, forma: pago ? f.forma : null, referencia: f.referencia, notas: f.notas,
    };
    const r = await guardarMovimiento(entrada);
    if (!r.ok) { setError(r.error); return; }
    avisar(r.mensaje ?? "Guardado");
    alCerrar();
    router.refresh();
  });
  const origen = ORIGENES.find((o) => o.id === f.concepto);
  return (
    <Dialogo abierto alCerrar={alCerrar} ancho="sm" titulo={f.id ? (pago ? "Editar pago" : "Editar cargo") : pago ? "Registrar pago" : "Agregar cargo"}
      subtitulo={pago ? "Cada pago que entra a caja, con su forma de pago y número de recibo." : "Lo que el cliente debe pagar además de la factura."}
      pie={<><Boton onClick={guardar} disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</Boton><Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton>{error ? <span className="text-[0.82rem] font-semibold text-bad">{error}</span> : null}</>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        {pago ? (
          <>
            <Campo etiqueta="De dónde viene" htmlFor="mv-origen" ayuda={origen?.ayuda} className="sm:col-span-2">
              <select id="mv-origen" className="campo" value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value, aplica_a: e.target.value === "separacion" ? "accesorios" : f.aplica_a, forma: e.target.value === "bono" ? "Nota de crédito" : e.target.value === "desembolso" ? "Transferencia" : f.forma })}>
                {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Aplicado a" htmlFor="mv-aplica" ayuda="El concepto de la aplicación de pago.">
              <select id="mv-aplica" className="campo" value={f.aplica_a} onChange={set("aplica_a")}>{CARGOS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            </Campo>
            <Campo etiqueta="Forma de pago" htmlFor="mv-forma">
              <select id="mv-forma" className="campo" value={f.forma} onChange={set("forma")}><option value="">—</option>{FORMAS_COBRO.map((x) => <option key={x}>{x}</option>)}</select>
            </Campo>
          </>
        ) : (
          <Campo etiqueta="Concepto" htmlFor="mv-concepto" className="sm:col-span-2">
            <select id="mv-concepto" className="campo" value={f.concepto} onChange={set("concepto")}>{CARGOS.filter((c) => c.id !== "factura").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
          </Campo>
        )}
        <Campo etiqueta="Monto" htmlFor="mv-monto" requerido>
          <input id="mv-monto" type="number" min={0} step="0.01" inputMode="decimal" className="campo" value={f.monto} onChange={set("monto")} autoFocus />
        </Campo>
        <Campo etiqueta="Fecha" htmlFor="mv-fecha"><input id="mv-fecha" type="date" className="campo" value={f.fecha} onChange={set("fecha")} /></Campo>
        <Campo etiqueta={pago ? "Recibo / referencia" : "Referencia"} htmlFor="mv-ref" ayuda={pago ? "Ej. CANRC 12345 o ACCRC 18892" : undefined}>
          <input id="mv-ref" className="campo" value={f.referencia} onChange={set("referencia")} maxLength={80} />
        </Campo>
        <Campo etiqueta="Nota" htmlFor="mv-nota"><input id="mv-nota" className="campo" value={f.notas} onChange={set("notas")} maxLength={300} /></Campo>
      </form>
    </Dialogo>
  );
}

function FormFactura({ ventaId, valor, alCerrar }: { ventaId: string; valor: number | null; alCerrar: () => void }) {
  const router = useRouter();
  const avisar = useAviso();
  const [v, setV] = useState(valor != null ? String(valor) : "");
  const [ocupado, iniciar] = useTransition();
  const guardar = () => iniciar(async () => {
    const r = await guardarValorFactura(ventaId, v.trim() ? Number(v) : null);
    avisar(r.ok ? r.mensaje ?? "Guardado" : r.error, r.ok ? "ok" : "error");
    if (r.ok) { alCerrar(); router.refresh(); }
  });
  return (
    <Dialogo abierto alCerrar={alCerrar} ancho="sm" titulo="Valor factura" subtitulo="El total de la factura de la unidad, con IVA."
      pie={<><Boton onClick={guardar} disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</Boton><Boton variante="secundario" onClick={alCerrar}>Cancelar</Boton></>}>
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <Campo etiqueta="Valor factura" htmlFor="vf"><input id="vf" type="number" min={0} step="0.01" inputMode="decimal" className="campo" value={v} onChange={(e) => setV(e.target.value)} autoFocus /></Campo>
      </form>
    </Dialogo>
  );
}

export function CuentaCliente({ ventaId, valorFactura, movimientos, documentos, cuenta, credito, contado, faltanCargos, separacionDefault }: Props) {
  const router = useRouter();
  const avisar = useAviso();
  const [editar, setEditar] = useState<Borrador | null>(null);
  const [factura, setFactura] = useState(false);
  const [borrar, setBorrar] = useState<Movimiento | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const cargos = movimientos.filter((m) => m.tipo === "cargo");
  const pagos = movimientos.filter((m) => m.tipo === "pago");
  const haySeparacion = pagos.some((p) => p.concepto === "separacion");
  const nuevo = (tipo: "cargo" | "pago"): Borrador => tipo === "cargo"
    ? { tipo, concepto: "accesorios", aplica_a: "", monto: "", fecha: hoy(), forma: "", referencia: "", notas: "" }
    : haySeparacion
      ? { tipo, concepto: "cliente", aplica_a: "factura", monto: "", fecha: hoy(), forma: "Transferencia", referencia: "", notas: "" }
      : { tipo, concepto: "separacion", aplica_a: "accesorios", monto: String(separacionDefault), fecha: hoy(), forma: "Tarjeta de débito", referencia: "", notas: "" };
  const aBorrador = (m: Movimiento): Borrador => ({
    id: m.id, tipo: m.tipo, concepto: m.concepto, aplica_a: m.aplica_a ?? "factura", monto: String(m.monto), fecha: m.fecha,
    forma: m.forma ?? "", referencia: m.referencia ?? "", notas: m.notas ?? "",
  });
  const acciones = (m: Movimiento) => (
    <span className="flex justify-end gap-0.5">
      <button type="button" aria-label="Editar" onClick={() => setEditar(aBorrador(m))} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"><Pencil className="size-4" /></button>
      <button type="button" aria-label="Borrar" onClick={() => setBorrar(m)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad"><Trash2 className="size-4" /></button>
    </span>
  );

  const saldoTono = !cuenta.completo ? "neutro" : cuenta.sinAdeudo ? "ok" : "bad";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface-2 px-4 py-3"><p className="text-[0.78rem] font-semibold text-muted">Total a pagar</p><p className="num text-[1.9rem]">{dinero2(cuenta.totalCargos)}</p><p className="text-[0.76rem] text-muted">Factura + cargos</p></div>
        <div className="rounded-2xl bg-surface-2 px-4 py-3"><p className="text-[0.78rem] font-semibold text-muted">Pagado</p><p className="num text-[1.9rem]">{dinero2(cuenta.totalPagos)}</p><p className="text-[0.76rem] text-muted">{pagos.length} {pagos.length === 1 ? "pago" : "pagos"}</p></div>
        <div className={cx("rounded-2xl px-4 py-3", saldoTono === "ok" ? "bg-ok-soft text-ok" : saldoTono === "bad" ? "bg-bad-soft text-bad" : "bg-surface-2")}>
          <p className="text-[0.78rem] font-semibold">{!cuenta.completo ? "Captura el valor factura" : cuenta.sinAdeudo ? (cuenta.saldo > 0 ? "Sin adeudo · saldo a favor" : "Sin adeudo: el carro sale") : "Falta por pagar: el carro no sale"}</p>
          <p className="num text-[1.9rem]">{cuenta.completo ? dinero2(Math.abs(cuenta.saldo)) : "—"}</p>
          <p className="text-[0.76rem] opacity-80">{cuenta.completo ? (cuenta.sinAdeudo ? "Todo cubierto" : "Si falta aunque sea $1, no se entrega") : "Es el cargo principal"}</p>
        </div>
      </div>

      {!contado && (credito?.monto || cuenta.desembolso) ? (
        <p className={cx("rounded-xl px-4 py-2.5 text-[0.84rem]", cuenta.diferenciaDesembolso && Math.abs(cuenta.diferenciaDesembolso) >= 1 ? "bg-warn-soft" : "bg-surface-2")}>
          Crédito aprobado: <strong>{credito?.monto ? dinero2(credito.monto) : "sin capturar"}</strong> · desembolso recibido: <strong>{cuenta.desembolso ? dinero2(cuenta.desembolso) : "pendiente"}</strong>
          {cuenta.diferenciaDesembolso != null && Math.abs(cuenta.diferenciaDesembolso) >= 1 ? <> · diferencia <strong>{dinero2(cuenta.diferenciaDesembolso)}</strong> (seguros o comisiones financiadas: revísalo con el banco)</> : null}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="flex-1 text-[0.92rem] font-semibold">Cargos <span className="font-normal text-muted">· lo que debe</span></h3>
            {faltanCargos ? <Boton variante="secundario" tamano="sm" icono={PackagePlus} disabled={ocupado} onClick={() => iniciar(async () => {
              const r = await cargosDeProductos(ventaId);
              avisar(r.ok ? r.mensaje ?? "Listo" : r.error, r.ok ? "ok" : "error");
              if (r.ok) router.refresh();
            })}>Cargar productos vendidos</Boton> : null}
            <Boton variante="secundario" tamano="sm" icono={Plus} onClick={() => setEditar(nuevo("cargo"))}>Cargo</Boton>
          </div>
          <Tabla>
            <thead><tr><th>Concepto</th><th className="text-right!">Monto</th><th /></tr></thead>
            <tbody>
              <tr>
                <td><strong>Factura de la unidad</strong></td>
                <td className="text-right font-semibold">{valorFactura ? dinero2(valorFactura) : <span className="text-bad">Falta</span>}</td>
                <td><span className="flex justify-end"><button type="button" aria-label="Editar valor factura" onClick={() => setFactura(true)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"><Pencil className="size-4" /></button></span></td>
              </tr>
              {cargos.map((m) => (
                <tr key={m.id}>
                  <td>{labelCargo(m.concepto)}{m.notas ? <span className="block text-[0.76rem] text-muted">{m.notas}</span> : null}</td>
                  <td className="text-right">{dinero2(m.monto)}</td>
                  <td>{acciones(m)}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="flex-1 text-[0.92rem] font-semibold">Pagos <span className="font-normal text-muted">· con qué se cubre</span></h3>
            <Boton tamano="sm" icono={Plus} onClick={() => setEditar(nuevo("pago"))}>{haySeparacion ? "Registrar pago" : "Registrar separación"}</Boton>
          </div>
          {pagos.length ? (
            <ul className="grid gap-2 grid-cols-[minmax(0,1fr)]">
              {pagos.map((m) => {
                const recibos = documentos.filter((d) => d.movimiento_id === m.id);
                const pideRecibo = (ORIGENES_CON_RECIBO as string[]).includes(m.concepto);
                return (
                  <li key={m.id} className="rounded-xl border border-line px-3 py-2.5">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.9rem] font-semibold">{labelOrigen(m.concepto)} <span className="font-normal text-muted">→ {labelCargo(m.aplica_a)}</span></p>
                        <p className="text-[0.78rem] text-muted">{fechaCorta(m.fecha)}{m.forma ? ` · ${m.forma}` : ""}{m.referencia ? ` · ${m.referencia}` : ""}{m.notas ? ` · ${m.notas}` : ""}</p>
                      </div>
                      <span className="num text-[1.25rem]">{dinero2(m.monto)}</span>
                      {acciones(m)}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {recibos.map((d) => <ChipArchivo key={d.id} doc={d} />)}
                      {pideRecibo && !recibos.length ? <Pastilla tono="warn">Falta el recibo</Pastilla> : null}
                      <BotonSubir ventaId={ventaId} tipo="recibo" movimientoId={m.id} texto={recibos.length ? "Otro archivo" : "Subir recibo"} variante="fantasma" />
                      <Boton variante="fantasma" tamano="sm" icono={Link2} onClick={() => setEnlace(m.id)}>Enlace</Boton>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">Sin pagos todavía. Empieza por la separación de {dinero2(separacionDefault)}.</p>
          )}
        </div>
      </div>

      {cuenta.porConcepto.length > 1 || cuenta.porConcepto.some((c) => c.pagado > 0) ? (
        <div>
          <h3 className="mb-2 text-[0.92rem] font-semibold">Cuadre por concepto <span className="font-normal text-muted">· como la aplicación de pago</span></h3>
          <Tabla>
            <thead><tr><th>Concepto</th><th className="text-right!">Cargo</th><th className="text-right!">Aplicado</th><th className="text-right!">Pendiente</th></tr></thead>
            <tbody>
              {cuenta.porConcepto.map((c) => (
                <tr key={c.concepto}>
                  <td>{c.label}</td>
                  <td className="text-right">{dinero2(c.cargo)}</td>
                  <td className="text-right">{dinero2(c.pagado)}</td>
                  <td className={cx("text-right font-semibold", c.pendiente > 0.004 ? "text-bad" : c.pendiente < -0.004 ? "text-accent" : "text-ok")}>
                    {c.pendiente > 0.004 ? dinero2(c.pendiente) : c.pendiente < -0.004 ? `${dinero2(-c.pendiente)} a favor` : "Cubierto"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          {cuenta.porConcepto.some((c) => c.pendiente < -0.004) && cuenta.porConcepto.some((c) => c.pendiente > 0.004) ? (
            <p className="mt-2 text-[0.8rem] text-muted">Hay saldo a favor en un concepto y pendiente en otro: pide a caja que reaplique (por ejemplo, la separación de Accesorios a Factura).</p>
          ) : null}
        </div>
      ) : null}

      {editar ? <FormMovimiento ventaId={ventaId} inicial={editar} alCerrar={() => setEditar(null)} /> : null}
      {factura ? <FormFactura ventaId={ventaId} valor={valorFactura} alCerrar={() => setFactura(false)} /> : null}
      {enlace ? <FormEnlace ventaId={ventaId} tipo="recibo" movimientoId={enlace} alCerrar={() => setEnlace(null)} /> : null}
      <Confirmar abierto={!!borrar} alCerrar={() => setBorrar(null)} titulo={borrar?.tipo === "cargo" ? "¿Borrar este cargo?" : "¿Borrar este pago?"} boton="Borrar" ocupado={ocupado}
        texto={borrar ? `${borrar.tipo === "cargo" ? labelCargo(borrar.concepto) : labelOrigen(borrar.concepto)} por ${dinero2(borrar.monto)}.${borrar.tipo === "pago" ? " También se quitan sus recibos." : ""}` : ""}
        alConfirmar={() => iniciar(async () => {
          const r = await borrarMovimiento(borrar!.id);
          setBorrar(null);
          avisar(r.ok ? r.mensaje ?? "Borrado" : r.error, r.ok ? "ok" : "error");
          if (r.ok) router.refresh();
        })} />
    </div>
  );
}
