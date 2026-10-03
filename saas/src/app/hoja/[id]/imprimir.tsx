"use client";

import { Printer } from "lucide-react";
import { Boton } from "@/components/ui";

export function BotonImprimir() {
  return <Boton icono={Printer} onClick={() => window.print()}>Imprimir o guardar PDF</Boton>;
}
