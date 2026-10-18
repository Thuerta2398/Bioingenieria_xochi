// GET /api/v2/export?key=CLAVE[&grupo=X] → CSV docente con registro de integridad
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { normGrupo } from "../lib/codigo.mts";
const KEY_SHA256 = "f9b33e0b6b851e5ea201f56a13cad0e3de63e99674bb32e4192eb506e88ffb09"; // huella de la clave docente
export default async (req: Request) => {
  const url = new URL(req.url), given = url.searchParams.get("key") ?? "", envKey = Netlify.env.get("TEACHER_KEY");
  const ok = envKey ? given === envKey : createHash("sha256").update(given, "utf8").digest("hex") === KEY_SHA256;
  if (!ok) return new Response("No autorizado", { status: 401 });
  const g = url.searchParams.get("grupo"), store = getStore({ name: "ranking-v2", consistency: "strong" });
  const { blobs } = await store.list({ prefix: g ? `g/${normGrupo(g)}/` : "g/" });
  const rows = ((await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))).filter(Boolean)) as any[];
  rows.sort((a, b) => a.grupo.localeCompare(b.grupo) || b.score - a.score);
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["grupo", "matricula", "nombre", "puntaje", "aprovechamiento_pct", "mundos_superados", "tiempo_activo_s", "salidas_ventana", "tiempo_fuera_s", "intentos_pegar", "intentos_copiar",
    ...[0, 1, 2, 3, 4, 5, 6].map(n => `mundo${n}_pct`), ...[0, 1, 2, 3, 4, 5, 6].map(n => `mundo${n}_intentos`), "envios", "fecha_codigo", "codigo", "ultima_actualizacion"];
  const lines = rows.map(r => [r.grupo, r.matricula, r.nombre, r.score, r.pct, r.worlds, r.time, r.salidas, r.fuera, r.pegados, r.copias,
    ...[0, 1, 2, 3, 4, 5, 6].map(n => r.mundos?.[n]?.pct ?? ""), ...[0, 1, 2, 3, 4, 5, 6].map(n => r.mundos?.[n]?.intentos ?? ""), r.envios, r.fecha, r.code, r.actualizado].map(q).join(","));
  return new Response("﻿" + head.join(",") + "\n" + lines.join("\n") + "\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="expedicion_nomenclatura${g ? "_" + normGrupo(g) : ""}.csv"`, "cache-control": "no-store" } });
};
export const config: Config = { path: "/api/v2/export", method: "GET" };
