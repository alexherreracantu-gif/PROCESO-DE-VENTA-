"use client";

import { RotateCcw } from "lucide-react";
import { Boton } from "@/components/ui";

export default function ErrorPortal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid justify-items-start gap-3 rounded-2xl border border-line bg-surface p-6">
      <h1 className="font-display text-3xl font-semibold">Algo falló al cargar esta pantalla</h1>
      <p className="max-w-[60ch] text-muted">Puede ser la conexión o la base de datos. Intenta de nuevo; si sigue pasando, avisa a dirección con este código: <code className="font-mono">{error.digest ?? "sin código"}</code>.</p>
      <Boton icono={RotateCcw} onClick={reset}>Intentar de nuevo</Boton>
    </div>
  );
}
