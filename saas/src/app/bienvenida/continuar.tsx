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
    <button type="button" onClick={() => router.replace("/inicio")} className="mt-4 rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">
      Entrar al portal
    </button>
  );
}
