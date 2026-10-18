// POST /api/score — registra el mejor intento de cada estudiante (una entrada por matrícula y grupo)
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { readCode, normMat, normGrupo } from "../lib/codigo.mts";

const MAX_SCORE = 2600; // 22 reactivos × 100 + bonos de racha
const MIN_TIME = 150;   // segundos: menos que esto no es plausible

type Entry = {
  nombre: string; matricula: string; grupo: string; score: number; pct: number; time: number;
  code: string; fecha: string; intentos: number; actualizado: string; detalle?: Record<string, number>;
};

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req: Request) => {
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400); }
  const nombre = String(body?.nombre ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const matricula = normMat(body?.matricula).slice(0, 20);
  const grupo = normGrupo(body?.grupo);
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (nombre.length < 3 || matricula.length < 4) return json({ ok: false, error: "Datos incompletos" }, 400);

  const c = readCode(code, matricula);
  if (!c.ok) return json({ ok: false, error: "Código inválido para esa matrícula" }, 400);
  if (c.score > MAX_SCORE || c.time < MIN_TIME) return json({ ok: false, error: "Resultado fuera de rango" }, 400);

  const detalle: Record<string, number> = {};
  for (const k of ["l1", "l2", "l3", "first", "streak"]) {
    const v = Number(body?.detalle?.[k]); if (Number.isFinite(v)) detalle[k] = Math.max(0, Math.min(5000, Math.round(v)));
  }

  const store = getStore({ name: "ranking", consistency: "strong" });
  const key = `g/${grupo}/${matricula}`;
  const prev = (await store.get(key, { type: "json" })) as Entry | null;
  const now = new Date().toISOString();
  const better = !prev || c.score > prev.score || (c.score === prev.score && c.time < prev.time);
  const entry: Entry = better
    ? { nombre, matricula, grupo, score: c.score, pct: c.pct, time: c.time, code, fecha: c.date, intentos: (prev?.intentos ?? 0) + 1, actualizado: now, detalle }
    : { ...prev!, nombre, intentos: (prev?.intentos ?? 0) + 1, actualizado: now };
  await store.setJSON(key, entry);

  // posición dentro del grupo
  const { blobs } = await store.list({ prefix: `g/${grupo}/` });
  const all = (await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))) as (Entry | null)[];
  const rows = all.filter(Boolean) as Entry[];
  rows.sort((a, b) => b.score - a.score || a.time - b.time);
  const posicion = rows.findIndex(r => r.matricula === matricula) + 1;
  return json({ ok: true, mejorado: better, mejor: entry.score, posicion, participantes: rows.length });
};

export const config: Config = { path: "/api/score", method: "POST" };
