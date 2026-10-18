# Nomenclatura inorgánica interactiva · CEUX Composición de la Materia

Sitio (GitHub Pages): https://thuerta2398.github.io/Bioingenieria_xochi/ → redirige a `laboratorio-nomenclatura/public/`.
En GitHub Pages no hay servidor: el ranking y el CSV del servidor se ocultan solos; la evidencia es la constancia + el código firmado (se valida en `verificador.html`).
Si se publica en Netlify (https://laboratorio-nomenclatura-bio.netlify.app) se activan ranking, registro y CSV.

| Ruta | Qué es |
|---|---|
| `/` | **Expedición Nomenclatura 2.0** — 7 mundos con desbloqueo secuencial (70 %), repasos, respuestas abiertas, teclado de fórmulas y registro de integridad |
| `/?grupo=BIO-101` | Enlace por grupo (el grupo queda fijo) |
| `/ranking.html?grupo=BIO-101` | Ranking en vivo v2 para proyectar |
| `/verificador.html` | Validación de códigos v1 (NOM-…) y v2 (N2-…) + descarga CSV (clave docente) |
| `/v1/` | Laboratorio de Nomenclatura 1.0 (se conserva intacto) |

## Estructura
- `public/js/banco2.js` — banco v2 (197 compuestos + 476 preguntas). **No editar a mano**: `python3 tools/gen_banco2.py public/js/banco2.js tools/banco2_revision.json` (reutiliza y verifica `gen_banco.py` de la v1; comprueba cargas, átomos, regla 2·O − H, sufijos –oso/–ico, orden de sales volátiles).
- `public/js/mundos.js` — mundos y repasos (texto editable).
- `public/js/exp.js` — motor del juego v2. `public/js/shared.js` — utilidades y códigos firmados v1/v2.
- `netlify/functions/` — API v1 (`/api/score|ranking|export`) y v2 (`/api/v2/score|ranking|export`). Datos en Netlify Blobs (stores `ranking` y `ranking-v2`).
- `tools/play_test2.py` — prueba automática que recorre los 7 mundos.
- `bb/` — indicaciones para Blackboard (v1 y v2).

## Integridad (v2)
Se registran salidas de la ventana (número y tiempo fuera), intentos de pegar/arrastrar texto (bloqueados) e intentos de copiar (bloqueados). A partir del 5.º evento de salidas o de pegado se descuentan 50 pts por evento. Todo va firmado dentro del código N2-… y en el CSV docente.

## Publicación
Netlify (proyecto `laboratorio-nomenclatura-bio`) con **base directory = `laboratorio-nomenclatura`**, publish `public`, functions `netlify/functions`.
