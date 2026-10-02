/**
 * Fotos de fábrica de cada modelo (BYD, octubre 2026), en public/modelos/<id>.jpg y <id>-mini.jpg.
 * Posiciones: 1 a 3 exterior, 4 interior. Una foto subida en el portal tiene prioridad.
 */
export const FOTOS_INCLUIDAS: Record<string, Partial<Record<1 | 2 | 3 | 4, string>>> = {
  "atto-8": { 1: "be134efaa318", 2: "3161f09b2ef7", 3: "0d830b84fa9c", 4: "9388b108a498" },
  "dolphin-mini-300": { 1: "b740bded75c5", 2: "1c905dab9690", 3: "c39c5176020a" },
  "dolphin-mini-380": { 1: "b740bded75c5", 2: "1c905dab9690", 3: "c39c5176020a" },
  "king-gl": { 1: "0db65ccfe6b0", 2: "116d092f3eb1", 4: "bba8afb7f54e" },
  "king-gs": { 1: "0db65ccfe6b0", 2: "116d092f3eb1", 4: "bba8afb7f54e" },
  "m9": { 1: "895f9cfde846", 2: "b06054f12487", 3: "3b7c5e3fe0af", 4: "4ccbc7a94e4c" },
  "seal-awd": { 1: "9064e0061c7d", 2: "fdfed848e6e9", 3: "a976fb705c17", 4: "9d50db5fe04e" },
  "seal-rwd": { 1: "9064e0061c7d", 2: "fdfed848e6e9", 3: "a976fb705c17", 4: "9d50db5fe04e" },
  "sealion-7": { 1: "75054d26068f", 2: "2e47e1cc9026", 3: "861fd622a2bf" },
  "shark-gl": { 1: "1cbb06dec8fb", 2: "3d125fbd9b66", 3: "b77b78585a15", 4: "3c7da37a55e7" },
  "shark-gs": { 1: "1cbb06dec8fb", 2: "3d125fbd9b66", 3: "b77b78585a15", 4: "3c7da37a55e7" },
  "song-plus": { 1: "dda5b6b33191", 2: "7022cc9824e4", 3: "bbe13e18f0d7", 4: "7e17b0bae0dd" },
  "song-pro": { 1: "c44ebd354b44", 2: "84340bfbaf9e", 3: "a073ebef6e3e", 4: "b8baa48c1ca0" },
  "yuan-pro-dmi": { 1: "59c6dfe30b95", 2: "03879bcdf9d5", 3: "602d5dceb8f7", 4: "ec39e6181f5c" },
  "yuan-pro-ev": { 1: "46a058b5a4fe", 2: "5e8ca75c6e25", 3: "32f7d55a0062", 4: "1dc4bcdfb906" },
};
