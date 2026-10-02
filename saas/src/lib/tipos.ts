import type { DatosCuadre } from "@/lib/dominio/cuadre";
import type { Calor, Etapa, EstatusVenta, Rol } from "@/lib/dominio/catalogos";

export type ParametrosAgencia = {
  placas_electrico?: number;
  placas_hibrido?: number;
  gestoria?: number;
  permiso_frontera?: number;
  separacion?: number;
  garantia_extendida?: number;
  meta_unidades?: number;
  meta_producto?: number;
};
export type Agencia = { id: string; nombre: string; marca: string; grupo: string | null; ciudad: string | null; parametros: ParametrosAgencia };
export type Perfil = {
  id: string; agencia_id: string; usuario: string; nombre: string; nombre_corto: string;
  rol: Rol; vende: boolean; activo: boolean; telefono: string | null;
};
export type Modelo = {
  id: string; clave: string; nombre: string; anio: number; motor: "electrico" | "hibrido";
  precio: number; bono: number; descripcion: string | null; activo: boolean; orden: number;
  banorte_submarca: string | null; banorte_anio: string | null; banorte_modelo: string | null;
};
export type Producto = { id: string; clave: string; nombre: string; nombre_corto: string; precio: number | null; activo: boolean; orden: number };
export type Venta = {
  id: string; folio: number; fecha: string; vendedor_id: string; cliente: string; num_cliente: string | null;
  telefono: string | null; vin: string | null; modelo_id: string; color: string; color_nombre: string | null;
  forma_pago: string; plaza: string; estatus: EstatusVenta; fecha_entrega: string | null; valor_factura: number | null;
  notas: string | null; expediente: Record<string, string>; cuadre: DatosCuadre; created_at: string; productos: string[];
};
export type Prospecto = {
  id: string; asesor_id: string; nombre: string; telefono: string | null; modelo_id: string | null; etapa: Etapa;
  origen: string; calor: Calor; siguiente_accion: string | null; fecha_siguiente: string | null; enganche: number | null;
  toma_a_cuenta: string | null; notas: string | null; venta_id: string | null; created_at: string; updated_at: string;
};
export type Corte = { fecha: string; usuario_id: string; valores: Record<string, number>; updated_at: string };
export type Metas = { mes: string; unidades: Record<string, number>; productos: Record<string, number>; guardadas: boolean };
export type FilaRanking = { vendedor_id: string; unidades: number; productos: number };
export type ProgresoAcademia = { usuario_id: string; respuestas: Record<string, number>; examen: Record<string, number>; examen_terminado: boolean };
export type Resultado = { ok: true; mensaje?: string; id?: string } | { ok: false; error: string };
