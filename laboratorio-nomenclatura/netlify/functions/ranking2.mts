// GET /api/v2/ranking?grupo=X → Top 10 (sin datos personales completos); sin grupo → lista de grupos
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { normGrupo, shortName } from "../lib/codigo.mts";
const json = (o: unknown) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export default async (req: Request) => {
  const url = new URL(req.url), store = getStore({ name: "ranking-v2", consistency: "strong" }), g = url.searchParams.get("grupo");
  if (!g) {
    const { directories } = await store.list({ prefix: "g/", directories: true });
    const grupos = await Promise.all(directories.map(async d => { const name = d.replace(/^g\//, "").replace(/\/$/, ""); const { blobs } = await store.list({ prefix: `g/${name}/` }); return { grupo: name, participantes: blobs.length }; }));
    return json({ grupos: grupos.filter(x => x.grupo !== "PRUEBA-QA") });
  }
  const grupo = normGrupo(g);
  const { blobs } = await store.list({ prefix: `g/${grupo}/` });
  const rows = ((await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))).filter(Boolean)) as any[];
  rows.sort((a, b) => b.score - a.score || b.worlds - a.worlds || a.time - b.time);
  const top = rows.slice(0, 10).map((r, i) => ({ pos: i + 1, nombre: shortName(r.nombre), id: String(r.matricula).slice(-3), score: r.score, pct: r.pct, worlds: r.worlds }));
  const promedio = rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;
  const completos = rows.filter(r => r.worlds === 7).length;
  return json({ grupo, participantes: rows.length, promedio, completos, top, actualizado: new Date().toISOString() });
};
export const config: Config = { path: "/api/v2/ranking", method: "GET" };
