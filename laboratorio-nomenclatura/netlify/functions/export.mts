// GET /api/export?key=CLAVE[&grupo=X]  → CSV completo para el docente (protegido con TEACHER_KEY)
import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { normGrupo } from "../lib/codigo.mts";

// Huella SHA-256 de la clave docente (no es la clave). Si existe la variable TEACHER_KEY en Netlify, tiene prioridad.
const KEY_SHA256 = "f9b33e0b6b851e5ea201f56a13cad0e3de63e99674bb32e4192eb506e88ffb09";

export default async (req: Request) => {
  const url = new URL(req.url);
  const given = url.searchParams.get("key") ?? "";
  const envKey = Netlify.env.get("TEACHER_KEY");
  const ok = envKey ? given === envKey : createHash("sha256").update(given, "utf8").digest("hex") === KEY_SHA256;
  if (!ok) return new Response("No autorizado", { status: 401 });
  const g = url.searchParams.get("grupo");
  const prefix = g ? `g/${normGrupo(g)}/` : "g/";
  const store = getStore({ name: "ranking", consistency: "strong" });
  const { blobs } = await store.list({ prefix });
  const rows = (await Promise.all(blobs.map(b => store.get(b.key, { type: "json" })))).filter(Boolean) as any[];
  rows.sort((a, b) => a.grupo.localeCompare(b.grupo) || b.score - a.score || a.time - b.time);
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["grupo", "matricula", "nombre", "mejor_puntaje", "aprovechamiento_pct", "tiempo_s", "nivel1", "nivel2", "nivel3", "aciertos_1er_intento", "mejor_racha", "intentos", "fecha_codigo", "codigo", "ultima_actualizacion"];
  const lines = rows.map(r => [r.grupo, r.matricula, r.nombre, r.score, r.pct, r.time, r.detalle?.l1, r.detalle?.l2, r.detalle?.l3, r.detalle?.first, r.detalle?.streak, r.intentos, r.fecha, r.code, r.actualizado].map(q).join(","));
  const csv = "﻿" + head.join(",") + "\n" + lines.join("\n") + "\n";
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="ranking_nomenclatura${g ? "_" + normGrupo(g) : ""}.csv"`, "cache-control": "no-store" }
  });
};

export const config: Config = { path: "/api/export", method: "GET" };
