import { ViewTransition, type ReactNode } from "react";

/**
 * Se vuelve a montar en cada cambio de pantalla: la pantalla anterior sale con un
 * desvanecido (View Transitions) y el contenido nuevo entra escalonado.
 */
export default function Plantilla({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="pagina-sale" enter="none" default="none">
      <div className="escalonado grid grid-cols-[minmax(0,1fr)] gap-6">{children}</div>
    </ViewTransition>
  );
}
