// Verificación del código v2 (misma lógica que public/js/shared.js → makeCode2)
import { createHmac } from "node:crypto";
import { normMat } from "./codigo.mts";

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KEY = "CEUX·BIO·Expedicion·Nomenclatura·v2·Ensenada";
const EPOCH = Date.UTC(2026, 0, 1);
const F: [string, number][] = [["ver", 2], ["score", 14], ["pct", 7], ["time", 14], ["worlds", 3], ["salidas", 7], ["fuera", 12], ["pegados", 6], ["copias", 6], ["day", 10]];

export function readCode2(code: string, matricula: string) {
  const raw = String(code || "").toUpperCase().replace(/^N2/, "").replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (raw.length !== 21) return { ok: false } as any;
  let all = 0n;
  for (const ch of raw) { const i = B32.indexOf(ch); if (i < 0) return { ok: false } as any; all = (all << 5n) | BigInt(i); }
  const sig = Number(all & 0xFFFFFn); let p = all >> 20n; const ps = p;
  const v: Record<string, number> = {};
  for (const [k, b] of [...F].reverse()) { v[k] = Number(p & ((1n << BigInt(b)) - 1n)); p >>= BigInt(b); }
  const h = createHmac("sha256", KEY).update(ps.toString(36) + "|" + normMat(matricula), "utf8").digest();
  const exp = ((h[0] << 12) | (h[1] << 4) | (h[2] >> 4)) >>> 0;
  let t = EPOCH + v.day * 86400000; while (t + 1024 * 86400000 <= Date.now()) t += 1024 * 86400000;
  return { ok: v.ver === 2 && v.pct <= 100 && exp === sig, ...v, date: new Date(t).toISOString().slice(0, 10) } as any;
}
