# CLASSIC 24

App para iPhone con tu preparación natural de Classic Physique en 24 semanas. Parte de la versión que armó ChatGPT, con correcciones y un panel de cumplimiento.

## Dónde abrirla

- **Versión publicada (recomendada):** https://claude.ai/artifact/VK3QDf3avSbb7dJY3zjZqs
  Tus datos se guardan en el espacio privado de tu cuenta de Claude y se ven igual en el iPhone y en la compu.
  En el iPhone: ábrela en Safari → **Compartir** → **Agregar a pantalla de inicio**.
- **Como app independiente (sin internet):** publica esta carpeta en GitHub Pages (**Settings → Pages →** *Deploy from a branch*, carpeta `/ (root)`), abre `https://<tu-usuario>.github.io/<repo>/classic24/` en Safari y agrégala a la pantalla de inicio. Así los datos viven **solo en ese iPhone**: exporta un respaldo cada semana (Ajustes → Exportar respaldo).

## Qué hace

| Pestaña | Para qué |
|---|---|
| **Hoy** | Días al show, semana y fase, anillos de tu semana y todas las metas del día con un toque para registrar (peso, pasos, sueño, posing, cardio, agua, creatina). Puedes moverte a días anteriores para registrar lo que olvidaste. |
| **Entreno** | Tu split de 6 días. Cada ejercicio muestra lo que cargaste **la última vez** y te avisa cuándo subir peso. Al marcar una serie arranca el temporizador de descanso (suena y sigue bien aunque bloquees el iPhone). Si perdiste una sesión, eliges cuál recuperar ese día. |
| **Comida** | Macros restantes, porciones rápidas (pollo, arroz, avena, tortillas…), alimento propio y "Repetir ayer". Creatina, whey y cafeína. |
| **Progreso** | **Panel de cumplimiento:** dona semanal, anillo por día, mapa de las 24 semanas y "Cómo recuperarlo" para cada meta fallada. Además: marcador semanal (peso ↓, cintura ↓, fuerza =/↑), ajuste sugerido de calorías con botón para aplicarlo, gráficas de peso y cintura, fuerza en los 5 básicos y check-in del domingo. |
| **Camino al escenario** (tarjeta café en Inicio) | Roadmap de las 7 fases, posing del día con timer y reglas de ajuste. El botón **+** del centro registra peso, pasos, sueño, cardio, posing, agua o creatina en un toque. |

## Cómo se calcula el cumplimiento

Cada día cuenta: pesaje, calorías entre 90 % y 110 %, proteína ≥ 90 %, pasos ≥ 95 %, entreno (si ese día toca), posing (días de pesas; diario desde la semana 17), sueño ≥ 7 h y creatina. El cardio se mide por semana. Verde ≥ 85 %, dorado 60–84 %, rojo < 60 %.

Una sesión perdida cuenta como recuperada si la haces en otro día de la misma semana.

## Qué corregí de la versión de ChatGPT

- Guardaba las fechas en UTC: en Monterrey, lo registrado después de las 6 pm caía en el día siguiente.
- La semana de preparación se contaba desde que abrías la app; ahora sale de la fecha de competencia.
- El temporizador se congelaba al bloquear el teléfono.
- El caché del service worker nunca dejaba pasar actualizaciones.
- Los checks de posing no se guardaban, y los botones de borrar y exportar no funcionaban dentro de claude.ai.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `app.js` | Programa, fases, porciones, cálculos y pantallas. **Los ejercicios están en `PLAN` y las porciones en `FOODS`.** |
| `styles.css` | Diseño |
| `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` | App instalable para GitHub Pages |
| `empaquetar.py` | Junta todo en un solo archivo para publicarlo en claude.ai: `python3 classic24/empaquetar.py classic24.html` |

No incluye ciclos, esteroides, diuréticos, laxantes ni protocolos de deshidratación.
