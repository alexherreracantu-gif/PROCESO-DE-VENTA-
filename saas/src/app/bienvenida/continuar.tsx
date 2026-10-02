"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Continuar() {
  const router = useRouter();
  useEffect(() => {
    router.prefetch("/inicio");
    const t = setTimeout(() => router.replace("/inicio"), 1500);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <button type="button" onClick={() => router.replace("/inicio")} className="mt-4 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-fg shadow-card hover:bg-surface-2">
      Entrar al portal
    </button>
  );
}
