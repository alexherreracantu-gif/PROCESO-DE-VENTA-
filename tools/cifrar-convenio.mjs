// Publica la presentación del convenio BYD Cumbres × Energon Solar con contraseña.
// Cifra la presentación (AES-GCM con llave PBKDF2) y genera saas/public/convenio/index.html,
// que el portal sirve en /convenio. El navegador la descifra solo con la contraseña correcta.
//
// Uso: node tools/cifrar-convenio.mjs <presentacion.html> <contraseña>
//
// El repositorio es público: nunca subas la presentación sin cifrar. La versión editable
// vive en el artifact https://claude.ai/artifact/8x5Lgz683G4XuKj6Fon8oK (con las imágenes
// incrustadas antes de cifrar). La contraseña no distingue mayúsculas de minúsculas.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [entrada, contraseña] = process.argv.slice(2);
if (!entrada || !contraseña) {
  console.error("Uso: node tools/cifrar-convenio.mjs <presentacion.html> <contraseña>");
  process.exit(1);
}

const ITERACIONES = 600000;
const salt = randomBytes(16), iv = randomBytes(12);
const llave = pbkdf2Sync(contraseña.trim().toUpperCase(), salt, ITERACIONES, 32, "sha256");
const cifrador = createCipheriv("aes-256-gcm", llave, iv);
const datos = Buffer.concat([cifrador.update(readFileSync(entrada)), cifrador.final(), cifrador.getAuthTag()]);
const sobre = JSON.stringify({ salt: salt.toString("base64"), iv: iv.toString("base64"), iter: ITERACIONES, datos: datos.toString("base64") });

const pagina = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Convenio BYD Cumbres × Energon</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap">
<style>
:root { --navy: #0F1B2A; --navy-2: #1A2A3D; --line: #2E4258; --text: #F6F5F1; --soft: #B9C6D3; --muted: #8FA0B2; --orange: #E8641E; --error: #FF9A66; color-scheme: dark; }
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; display: grid; place-items: center; padding: 24px 16px; background: radial-gradient(70% 60% at 80% 0%, rgba(232, 100, 30, .22), rgba(232, 100, 30, 0) 70%), var(--navy); color: var(--soft); font: 400 1rem/1.5 'DM Sans', 'Helvetica Neue', Arial, sans-serif; }
main { width: min(420px, 100%); display: grid; gap: 22px; text-align: center; animation: entrar .9s cubic-bezier(.2, .7, .2, 1) both; }
.marcas { display: flex; align-items: center; justify-content: center; gap: 16px; }
.marcas img { height: 40px; width: auto; }
.marcas span { color: var(--muted); font-size: 1.3rem; }
.raya { width: 160px; height: 2px; margin: 0 auto; background: linear-gradient(90deg, rgba(232, 100, 30, 0), var(--orange), rgba(232, 100, 30, 0)); }
h1 { margin: 0; color: var(--text); font: 800 1.6rem/1.15 Montserrat, Arial, sans-serif; text-wrap: balance; }
p { margin: 0; }
form { display: grid; gap: 12px; padding: 22px; border: 1px solid var(--line); border-radius: 16px; background: var(--navy-2); text-align: left; }
label { color: var(--text); font-weight: 700; font-size: .9rem; }
input { width: 100%; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--navy); color: var(--text); font: 500 1.05rem/1.2 'DM Sans', Arial, sans-serif; letter-spacing: .08em; }
input:focus { outline: 2px solid var(--orange); outline-offset: 1px; border-color: transparent; }
button { padding: 12px 14px; border: 0; border-radius: 10px; background: var(--orange); color: var(--navy); font: 800 1rem/1.2 Montserrat, Arial, sans-serif; cursor: pointer; }
button:disabled { opacity: .7; cursor: wait; }
button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
.aviso { min-height: 1.4em; color: var(--error); font-size: .9rem; }
small { color: var(--muted); font-size: .8rem; }
@keyframes entrar { from { opacity: 0; filter: blur(8px); transform: translateY(12px); } to { opacity: 1; filter: blur(0); transform: none; } }
@media (prefers-reduced-motion: reduce) { main { animation: none; } }
</style>
</head>
<body>
<main>
  <div class="marcas">
    <img src="/marca/byd-grupo-tec-blanco.png" alt="BYD Grupo TEC" width="126" height="40">
    <span aria-hidden="true">×</span>
    <img src="/convenio/energon-blanco.png" alt="Energon Solar" width="139" height="40">
  </div>
  <div class="raya" aria-hidden="true"></div>
  <h1>Convenio BYD Cumbres × Energon Solar</h1>
  <p>Documento interno para dirección. Escribe la contraseña para ver la presentación.</p>
  <form id="acceso" novalidate>
    <label for="clave">Contraseña</label>
    <input id="clave" name="clave" type="password" autocomplete="current-password" autocapitalize="characters" spellcheck="false" required>
    <button id="entrar" type="submit">Entrar</button>
    <p class="aviso" id="aviso" role="alert"></p>
  </form>
  <small>BYD Cumbres · Park Point · Grupo TEC</small>
</main>
<script>
const SOBRE = ${sobre};
const LLAVE_SESION = "convenio-energon-clave";
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function descifrar(clave) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(clave.trim().toUpperCase()), "PBKDF2", false, ["deriveKey"]);
  const llave = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(SOBRE.salt), iterations: SOBRE.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(SOBRE.iv) }, llave, bytes(SOBRE.datos)));
}

function mostrar(html) {
  document.open();
  document.write(html);
  document.close();
}

async function intentar(clave, recordar) {
  const html = await descifrar(clave);
  if (recordar) { try { sessionStorage.setItem(LLAVE_SESION, clave); } catch {} }
  mostrar(html);
}

const form = document.getElementById("acceso"), campo = document.getElementById("clave"), boton = document.getElementById("entrar"), aviso = document.getElementById("aviso");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!campo.value.trim()) { aviso.textContent = "Escribe la contraseña."; campo.focus(); return; }
  boton.disabled = true; boton.textContent = "Abriendo…"; aviso.textContent = "";
  try {
    await intentar(campo.value, true);
  } catch {
    boton.disabled = false; boton.textContent = "Entrar";
    aviso.textContent = "Esa contraseña no es correcta. Inténtalo de nuevo.";
    campo.select();
  }
});

(async () => {
  let guardada = null;
  try { guardada = sessionStorage.getItem(LLAVE_SESION); } catch {}
  if (guardada) { try { await intentar(guardada, false); return; } catch {} }
  campo.focus();
})();
</script>
</body>
</html>
`;

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const salida = join(raiz, "saas/public/convenio/index.html");
mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, pagina);
console.log(`${salida} (${Math.round(pagina.length / 1024)} KB)`);
