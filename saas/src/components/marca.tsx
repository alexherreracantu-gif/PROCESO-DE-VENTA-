import Image from "next/image";
import { cx } from "@/components/ui";

/** Logo BYD Grupo TEC. `blanco` sobre fondos azules u oscuros; `azul` sobre fondos claros. */
export function Logo({ tono = "blanco", ancho = 150, className, prioridad }: { tono?: "blanco" | "azul"; ancho?: number; className?: string; prioridad?: boolean }) {
  return (
    <Image src={`/marca/byd-grupo-tec-${tono}.png`} alt="BYD Grupo TEC" width={1139} height={362} priority={prioridad}
      style={{ width: ancho, height: "auto" }} className={className} />
  );
}

/** Insignia cuadrada azul con la marca BYD, para espacios chicos. */
export function Insignia({ tamano = 36, className }: { tamano?: number; className?: string }) {
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-[10px] bg-brand", className)} style={{ width: tamano, height: tamano }}>
      <Image src="/marca/byd-blanco.png" alt="BYD" width={1139} height={224} style={{ width: tamano * 0.7, height: "auto" }} />
    </span>
  );
}
