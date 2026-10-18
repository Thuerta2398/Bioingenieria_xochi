// GET /api/ranking?grupo=X  → Top 10 del grupo (nombres abreviados, sin matrícula)
// GET /api/ranking           → lista de grupos con participantes
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { normGrupo, shortName } from "../lib/codigo.mts";

const json = (o: unknown) =>
  new Response(JSON.stringify(o), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default async (req: Request) => {
  const url = new URL(req.url);
  const store = getStore({ name: "ranking", consistency: "strong" });
  const g = url.searchParams.get("grupo");
  if (!g) {
    const { directories } = await store.list({ prefix: "g/", directories: true });
    const grupos = await Promise.all(directories.map(async d => {
      const name = d.replace(/^g\//, "").replace(/\/$/, "");
      const { blobs } = await store.list({ prefix: `g/${name}/` });
      return { grupo: name, participantes: blobs.length };
    }));
    return json({ grupos: grupos.filter(x => x.grupo !== "PRUEBA-QA") });
  }
  const grupo = normGrupo(g);
  const { blobs } = await store.list({ prefix: `g/${grupo}/` });
  const rows = (await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))).filter(Boolean) as any[];
  rows.sort((a, b) => b.score - a.score || a.time - b.time);
  const top = rows.slice(0, 10).map((r, i) => ({ pos: i + 1, nombre: shortName(r.nombre), score: r.score, pct: r.pct, time: r.time, id: String(r.matricula).slice(-3) }));
  const promedio = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
  return json({ grupo, participantes: rows.length, promedio, top, actualizado: new Date().toISOString() });
};

export const config: Config = { path: "/api/ranking", method: "GET" };
