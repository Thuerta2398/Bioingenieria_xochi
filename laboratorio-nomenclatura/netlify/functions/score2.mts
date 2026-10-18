// POST /api/v2/score — Expedición 2.0: guarda el mejor registro por matrícula y grupo
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { normMat, normGrupo } from "../lib/codigo.mts";
import { readCode2 } from "../lib/codigo2.mts";

const MAX_SCORE = 6000;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req: Request) => {
  let body: any; try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const nombre = String(body?.nombre ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const matricula = normMat(body?.matricula).slice(0, 20), grupo = normGrupo(body?.grupo);
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (nombre.length < 3 || matricula.length < 4) return json({ ok: false, error: "Datos incompletos" }, 400);
  const c = readCode2(code, matricula);
  if (!c.ok) return json({ ok: false, error: "Código inválido para esa matrícula" }, 400);
  if (c.score > MAX_SCORE || (c.worlds > 0 && c.time < 20 * c.worlds)) return json({ ok: false, error: "Resultado fuera de rango" }, 400);
  const mundos: Record<string, unknown> = {};
  if (body?.mundos && typeof body.mundos === "object") for (const k of Object.keys(body.mundos).slice(0, 7)) {
    const m = body.mundos[k]; mundos[k] = m ? { pts: Math.min(1200, Math.max(0, Number(m.pts) || 0)), pct: Math.min(100, Math.max(0, Number(m.pct) || 0)), intentos: Math.min(999, Math.max(0, Number(m.intentos) || 0)) } : null;
  }
  const store = getStore({ name: "ranking-v2", consistency: "strong" });
  const key = `g/${grupo}/${matricula}`;
  const prev = (await store.get(key, { type: "json" })) as any;
  const now = new Date().toISOString();
  const better = !prev || c.score > prev.score || (c.score === prev.score && c.worlds > prev.worlds);
  const entry = better
    ? { nombre, matricula, grupo, score: c.score, pct: c.pct, worlds: c.worlds, time: c.time, salidas: c.salidas, fuera: c.fuera, pegados: c.pegados, copias: c.copias, code, fecha: c.date, mundos, envios: (prev?.envios ?? 0) + 1, actualizado: now }
    : { ...prev, nombre, envios: (prev?.envios ?? 0) + 1, actualizado: now, ultimo: { score: c.score, salidas: c.salidas, pegados: c.pegados, code } };
  await store.setJSON(key, entry);
  const { blobs } = await store.list({ prefix: `g/${grupo}/` });
  const rows = ((await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))).filter(Boolean)) as any[];
  rows.sort((a, b) => b.score - a.score || b.worlds - a.worlds || a.time - b.time);
  return json({ ok: true, mejorado: better, mejor: entry.score, posicion: rows.findIndex(r => r.matricula === matricula) + 1, participantes: rows.length });
};
export const config: Config = { path: "/api/v2/score", method: "POST" };
