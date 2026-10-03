/**
 * Pruebas de permisos (RLS) contra un Postgres real.
 * Corre con DATABASE_URL_PRUEBAS apuntando a una base con las migraciones aplicadas
 * (en CI: Postgres limpio + supabase/pruebas/supabase-minimo.sql + migraciones).
 * Cada prueba trabaja dentro de una transacción que se deshace al final.
 */
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const url = process.env.DATABASE_URL_PRUEBAS;
const sql = url ? postgres(url, { max: 1, onnotice: () => {} }) : null;
afterAll(async () => { await sql?.end(); });

class Deshacer extends Error {}
type Tx = postgres.TransactionSql;

async function escenario(fn: (tx: Tx, d: Datos) => Promise<void>) {
  await sql!.begin(async (tx) => {
    const d = await sembrar(tx);
    await fn(tx, d);
    throw new Deshacer();
  }).catch((e) => { if (!(e instanceof Deshacer)) throw e; });
}

type Datos = Awaited<ReturnType<typeof sembrar>>;
async function sembrar(tx: Tx) {
  const agA = randomUUID(), agB = randomUUID();
  const ceo = randomUUID(), jorge = randomUUID(), omar = randomUUID(), mariana = randomUUID(), ajeno = randomUUID();
  await tx`insert into public.agencias (id, nombre) values (${agA}, 'Agencia A'), (${agB}, 'Agencia B')`;
  for (const [id, usuario, ag, rol, vende] of [
    [ceo, "t-ceo", agA, "ceo", false], [jorge, "t-jorge", agA, "gerente", true], [omar, "t-omar", agA, "asesor", true],
    [mariana, "t-mariana", agA, "asesor", true], [ajeno, "t-ajeno", agB, "gerente", true],
  ] as const) {
    await tx`insert into auth.users (id, email) values (${id}, ${usuario + "@prueba.mx"})`;
    await tx`insert into public.perfiles (id, agencia_id, usuario, nombre, nombre_corto, rol, vende) values (${id}, ${ag}, ${usuario + "-" + id.slice(0, 6)}, ${usuario}, ${usuario}, ${rol}, ${vende})`;
  }
  const [modA] = await tx`insert into public.modelos (agencia_id, clave, nombre, anio, motor, precio) values (${agA}, 'king', 'King', 2027, 'hibrido', 524900) returning id`;
  const [modB] = await tx`insert into public.modelos (agencia_id, clave, nombre, anio, motor, precio) values (${agB}, 'king', 'King', 2027, 'hibrido', 524900) returning id`;
  const [prodA] = await tx`insert into public.productos (agencia_id, clave, nombre, nombre_corto) values (${agA}, 'garantia', 'Garantía', 'Garantía') returning id`;
  const ventaOmar = randomUUID(), ventaMariana = randomUUID();
  await tx`insert into public.ventas (id, agencia_id, vendedor_id, cliente, modelo_id, color, vin) values
    (${ventaOmar}, ${agA}, ${omar}, 'Cliente de Omar', ${modA.id}, 'Blanco', 'LGXCE4CB1R0012345'),
    (${ventaMariana}, ${agA}, ${mariana}, 'Cliente de Mariana', ${modA.id}, 'Gris', null)`;
  await tx`insert into public.venta_productos (venta_id, producto_id) values (${ventaOmar}, ${prodA.id})`;
  await tx`insert into public.ventas (agencia_id, vendedor_id, cliente, modelo_id, color) values (${agB}, ${ajeno}, 'Cliente ajeno', ${modB.id}, 'Negro')`;
  return { agA, agB, ceo, jorge, omar, mariana, ajeno, modA: modA.id as string, prodA: prodA.id as string, ventaOmar, ventaMariana };
}

async function como(tx: Tx, uid: string | null) {
  await tx`reset role`;
  if (uid) {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role: "authenticated" })}, true)`;
    await tx`set local role authenticated`;
  } else {
    await tx`select set_config('request.jwt.claims', '', true)`;
    await tx`set local role anon`;
  }
}
const d = url ? describe : describe.skip;

d("permisos por rol (RLS)", () => {
  it("el asesor solo ve sus ventas; dirección ve las de su agencia; nadie ve otra agencia", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      expect((await tx`select cliente from public.ventas`).map((r) => r.cliente)).toEqual(["Cliente de Omar"]);
      await como(tx, x.jorge);
      expect((await tx`select cliente from public.ventas order by cliente`).map((r) => r.cliente)).toEqual(["Cliente de Mariana", "Cliente de Omar"]);
      await como(tx, x.ceo);
      expect(await tx`select 1 from public.ventas`).toHaveLength(2);
      await como(tx, x.ajeno);
      expect((await tx`select cliente from public.ventas`).map((r) => r.cliente)).toEqual(["Cliente ajeno"]);
      expect(await tx`select 1 from public.modelos where agencia_id = ${x.agA}`).toHaveLength(0);
    }));

  it("sin sesión no se puede leer nada", () =>
    escenario(async (tx) => {
      await como(tx, null);
      const err = await tx.savepoint((s) => s`select * from public.ventas`).catch((e) => e);
      expect(String(err)).toMatch(/permission denied/);
    }));

  it("el asesor no puede registrar ventas a nombre de otro", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      const err = await tx.savepoint((s) => s`insert into public.ventas (vendedor_id, cliente, modelo_id, color) values (${x.mariana}, 'X', ${x.modA}, 'Rojo')`).catch((e) => e);
      expect(String(err)).toMatch(/row-level security/);
      await tx`insert into public.ventas (vendedor_id, cliente, modelo_id, color, vin) values (${x.omar}, 'Nuevo', ${x.modA}, 'Rojo', 'lgxce4cb3r0019876')`;
      const [v] = await tx`select vin, agencia_id from public.ventas where cliente = 'Nuevo'`;
      expect(v.vin).toBe("LGXCE4CB3R0019876");
      expect(v.agencia_id).toBe(x.agA);
    }));

  it("dirección registra ventas para cualquier vendedor de su agencia, pero no de otra", () =>
    escenario(async (tx, x) => {
      await como(tx, x.jorge);
      await tx`insert into public.ventas (vendedor_id, cliente, modelo_id, color) values (${x.mariana}, 'Por Jorge', ${x.modA}, 'Azul')`;
      const err = await tx.savepoint((s) => s`insert into public.ventas (vendedor_id, cliente, modelo_id, color) values (${x.ajeno}, 'Intruso', ${x.modA}, 'Azul')`).catch((e) => e);
      expect(String(err)).toMatch(/no pertenece/);
    }));

  it("un VIN no se repite en dos ventas vivas", () =>
    escenario(async (tx, x) => {
      await como(tx, x.jorge);
      const err = await tx.savepoint((s) => s`insert into public.ventas (vendedor_id, cliente, modelo_id, color, vin) values (${x.mariana}, 'Dup', ${x.modA}, 'Azul', 'LGXCE4CB1R0012345')`).catch((e) => e);
      expect(String(err)).toMatch(/ventas_vin_unico/);
      const err2 = await tx.savepoint((s) => s`insert into public.ventas (vendedor_id, cliente, modelo_id, color, vin) values (${x.mariana}, 'VIN malo', ${x.modA}, 'Azul', 'ABC')`).catch((e) => e);
      expect(String(err2)).toMatch(/check/);
    }));

  it("solo dirección borra ventas; el asesor no", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      await tx`delete from public.ventas where id = ${x.ventaOmar}`;
      await como(tx, x.jorge);
      expect(await tx`select 1 from public.ventas where id = ${x.ventaOmar}`).toHaveLength(1);
      await tx`delete from public.ventas where id = ${x.ventaOmar}`;
      expect(await tx`select 1 from public.ventas where id = ${x.ventaOmar}`).toHaveLength(0);
    }));

  it("el asesor no puede cambiarse el rol ni editar el catálogo o las metas", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      const e1 = await tx.savepoint((s) => s`update public.perfiles set rol = 'ceo' where id = ${x.omar}`).catch((e) => e);
      expect(String(e1)).toMatch(/permission denied/);
      await tx`update public.perfiles set telefono = '8111111111' where id = ${x.omar}`;
      await tx`update public.modelos set precio = 1 where id = ${x.modA}`;
      const e2 = await tx.savepoint((s) => s`insert into public.metas (mes, vendedor_id, unidades) values ('2026-10-01', ${x.omar}, 99)`).catch((e) => e);
      expect(String(e2)).toMatch(/row-level security/);
      await como(tx, x.jorge);
      const [m] = await tx`select precio from public.modelos where id = ${x.modA}`;
      expect(Number(m.precio)).toBe(524900);
      await tx`insert into public.metas (mes, vendedor_id, unidades) values ('2026-10-01', ${x.omar}, 15)`;
    }));

  it("los productos de una venta siguen los permisos de la venta", () =>
    escenario(async (tx, x) => {
      await como(tx, x.mariana);
      expect(await tx`select 1 from public.venta_productos`).toHaveLength(0);
      const err = await tx.savepoint((s) => s`insert into public.venta_productos (venta_id, producto_id) values (${x.ventaOmar}, ${x.prodA})`).catch((e) => e);
      expect(String(err)).toMatch(/row-level security/);
      await como(tx, x.omar);
      expect(await tx`select 1 from public.venta_productos`).toHaveLength(1);
    }));

  it("el ranking muestra números de todo el equipo sin exponer clientes", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      const filas = await tx`select vendedor_id, unidades, productos from public.ranking_mes(current_date)`;
      const porId = Object.fromEntries(filas.map((r) => [r.vendedor_id, r]));
      expect(porId[x.omar]).toMatchObject({ unidades: 1, productos: 1 });
      expect(porId[x.mariana]).toMatchObject({ unidades: 1, productos: 0 });
      expect(porId[x.ajeno]).toBeUndefined();
    }));

  it("cada quien captura su corte; dirección los ve todos", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      await tx`insert into public.cortes (fecha, valores) values (current_date, '{"citas": 2}')`;
      const err = await tx.savepoint((s) => s`insert into public.cortes (fecha, usuario_id, valores) values (current_date, ${x.mariana}, '{}')`).catch((e) => e);
      expect(String(err)).toMatch(/row-level security/);
      await como(tx, x.mariana);
      expect(await tx`select 1 from public.cortes`).toHaveLength(0);
      await como(tx, x.jorge);
      expect(await tx`select 1 from public.cortes`).toHaveLength(1);
    }));

  it("la bitácora registra cambios y solo dirección la lee", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      await tx`update public.ventas set estatus = 'entregada' where id = ${x.ventaOmar}`;
      expect(await tx`select 1 from public.bitacora`).toHaveLength(0);
      await como(tx, x.jorge);
      const filas = await tx`select accion, usuario_id from public.bitacora where registro_id = ${x.ventaOmar} order by id`;
      expect(filas.map((f) => f.accion)).toEqual(["insert", "update"]);
      expect(filas[1].usuario_id).toBe(x.omar);
    }));

  it("guardar_venta guarda venta y productos juntos, con los permisos de quien la llama", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      const [r] = await tx`select public.guardar_venta(${tx.json({ vendedor_id: x.omar, cliente: "Por RPC", modelo_id: x.modA, color: "Azul", forma_pago: "Contado", plaza: "Monterrey", estatus: "apartada" })}, ${[x.prodA]}::uuid[]) as id`;
      const [v] = await tx`select cliente, (select count(*) from public.venta_productos where venta_id = ${r.id})::int as prods from public.ventas where id = ${r.id}`;
      expect(v).toMatchObject({ cliente: "Por RPC", prods: 1 });
      const e1 = await tx.savepoint((sp) => sp`select public.guardar_venta(${tx.json({ vendedor_id: x.mariana, cliente: "Ajena", modelo_id: x.modA, color: "Azul", forma_pago: "Contado", plaza: "Monterrey" })}, ${[]}::uuid[])`).catch((e) => e);
      expect(String(e1)).toMatch(/row-level security/);
      const e2 = await tx.savepoint((sp) => sp`select public.guardar_venta(${tx.json({ id: x.ventaMariana, vendedor_id: x.omar, cliente: "Robada", modelo_id: x.modA, color: "Azul", forma_pago: "Contado", plaza: "Monterrey", estatus: "facturada" })}, ${[]}::uuid[])`).catch((e) => e);
      expect(String(e2)).toMatch(/no tienes permiso/);
    }));

  it("las fotos de modelos: dirección las sube, el equipo las ve, nadie de otra agencia", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      const e1 = await tx.savepoint((sp) => sp`insert into public.modelo_fotos (modelo_id, posicion, datos, miniatura) values (${x.modA}, 1, 'AAAA', 'AAAA')`).catch((e) => e);
      expect(String(e1)).toMatch(/row-level security/);
      await como(tx, x.jorge);
      await tx`insert into public.modelo_fotos (modelo_id, posicion, datos, miniatura) values (${x.modA}, 1, 'AAAA', 'AAAA')`;
      await como(tx, x.omar);
      expect(await tx`select posicion from public.modelo_fotos where modelo_id = ${x.modA}`).toHaveLength(1);
      await tx`delete from public.modelo_fotos where modelo_id = ${x.modA}`;
      await como(tx, x.ajeno);
      expect(await tx`select 1 from public.modelo_fotos where modelo_id = ${x.modA}`).toHaveLength(0);
      await como(tx, null);
      const e2 = await tx.savepoint((sp) => sp`select 1 from public.modelo_fotos`).catch((e) => e);
      expect(String(e2)).toMatch(/permission denied/);
      await como(tx, x.jorge);
      expect(await tx`select 1 from public.modelo_fotos where modelo_id = ${x.modA}`).toHaveLength(1);
    }));

  it("el expediente (pagos y archivos) sigue a la venta: el asesor solo el suyo, dirección todos, nadie de otra agencia", () =>
    escenario(async (tx, x) => {
      await como(tx, x.omar);
      const [m] = await tx`insert into public.venta_movimientos (venta_id, tipo, concepto, aplica_a, monto) values (${x.ventaOmar}, 'pago', 'separacion', 'accesorios', 5000) returning id`;
      await tx`insert into public.venta_documentos (venta_id, tipo, movimiento_id, nombre, ruta) values (${x.ventaOmar}, 'recibo', ${m.id}, 'recibo.pdf', ${`${x.agA}/${x.ventaOmar}/a-recibo.pdf`})`;
      await tx`insert into public.venta_documentos (venta_id, tipo, nombre, enlace) values (${x.ventaOmar}, 'ine', 'INE', 'https://drive.google.com/file/d/x')`;
      // No puede escribir en el expediente de Mariana ni ver el suyo.
      const e1 = await tx.savepoint((sp) => sp`insert into public.venta_movimientos (venta_id, tipo, concepto, monto) values (${x.ventaMariana}, 'pago', 'cliente', 100)`).catch((e) => e);
      expect(String(e1)).toMatch(/row-level security/);
      // La ruta del archivo tiene que ser de su venta.
      const e2 = await tx.savepoint((sp) => sp`insert into public.venta_documentos (venta_id, tipo, nombre, ruta) values (${x.ventaOmar}, 'ine', 'x', ${`${x.agA}/${x.ventaMariana}/x.pdf`})`).catch((e) => e);
      expect(String(e2)).toMatch(/no corresponde/);
      expect(await tx`select 1 from public.venta_documentos`).toHaveLength(2);
      await como(tx, x.mariana);
      expect(await tx`select 1 from public.venta_movimientos`).toHaveLength(0);
      expect(await tx`select 1 from public.venta_documentos`).toHaveLength(0);
      expect(await tx`delete from public.venta_documentos returning id`).toHaveLength(0);
      await como(tx, x.jorge);
      expect(await tx`select 1 from public.venta_documentos`).toHaveLength(2);
      expect(await tx`select monto from public.venta_movimientos`).toHaveLength(1);
      await como(tx, x.ajeno);
      expect(await tx`select 1 from public.venta_movimientos`).toHaveLength(0);
      expect(await tx`select 1 from public.venta_documentos`).toHaveLength(0);
      await como(tx, null);
      const e3 = await tx.savepoint((sp) => sp`select 1 from public.venta_documentos`).catch((e) => e);
      expect(String(e3)).toMatch(/permission denied/);
      // Al borrar el pago se van sus recibos.
      await como(tx, x.omar);
      await tx`delete from public.venta_movimientos where id = ${m.id}`;
      expect(await tx`select tipo from public.venta_documentos`).toEqual([{ tipo: "ine" }]);
    }));
});
