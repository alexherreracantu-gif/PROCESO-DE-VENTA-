/**
 * Piezas oficiales de la campaña que vienen incluidas en el portal (public/anuncios/<mes>/).
 * Las que sube dirección viven en la base (tabla anuncios_oficiales) y se suman a estas.
 */
export type PiezaIncluida = { archivo: string; titulo: string; clave: string | null };

export const ANUNCIOS_INCLUIDOS: Record<string, PiezaIncluida[]> = {
  "2026-10": [
    { archivo: "song-plus-mensualidad", titulo: "Song Plus · mensualidades desde $6,141", clave: "song-plus" },
    { archivo: "yuan-pro-dmi-mensualidad", titulo: "Yuan Pro DM-i · mensualidades desde $7,945", clave: "yuan-pro-dmi" },
    { archivo: "song-pro-mensualidad", titulo: "Song Pro · mensualidades desde $8,645", clave: "song-pro" },
    { archivo: "shark-mensualidad", titulo: "Shark · mensualidades desde $14,731", clave: "shark-gl" },
    { archivo: "unidades-demo", titulo: "Últimas unidades demo 2025-2026", clave: null },
  ],
};

export const rutaIncluida = (mes: string, archivo: string, mini = false) => `/anuncios/${mes}/${archivo}${mini ? "-mini" : ""}.jpg`;
