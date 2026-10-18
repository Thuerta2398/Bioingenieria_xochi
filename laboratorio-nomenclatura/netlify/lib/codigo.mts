// Verificación del código de evidencia (misma lógica que public/js/shared.js)
import { createHmac } from "node:crypto";

const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const KEY = "CEUX·BIO·Nomenclatura·IUPAC2005·v1·Ensenada";
const EPOCH = Date.UTC(2026, 0, 1);

export const normMat = (m: unknown) => String(m ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const normGrupo = (g: unknown) =>
  String(g ?? "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "SIN-GRUPO";
export const shortName = (n: string) => {
  const p = String(n || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "Anónimo";
  return p.length > 1 ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0];
};

function hmac20(msg: string): number {
  const sig = createHmac("sha256", KEY).update(msg, "utf8").digest();
  return ((sig[0] << 12) | (sig[1] << 4) | (sig[2] >> 4)) >>> 0;
}

export function readCode(code: string, matricula: string) {
  const raw = String(code || "").toUpperCase().replace(/^NOM/, "").replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0").replace(/[IL]/g, "1");
  if (raw.length !== 13) return { ok: false as const };
  let all = 0n;
  for (const ch of raw) {
    const i = B32.indexOf(ch);
    if (i < 0) return { ok: false as const };
    all = (all << 5n) | BigInt(i);
  }
  const sig = Number(all & 0xFFFFFn);
  const payload = all >> 20n;
  const v = Number(payload >> 43n);
  const score = Number((payload >> 30n) & 8191n);
  const pct = Number((payload >> 23n) & 127n);
  const time = Number((payload >> 10n) & 8191n);
  const day = Number(payload & 1023n);
  const ok = v === 1 && pct <= 100 && hmac20(payload.toString(36) + "|" + normMat(matricula)) === sig;
  let t = EPOCH + day * 86400000;
  while (t + 1024 * 86400000 <= Date.now()) t += 1024 * 86400000;
  return { ok, score, pct, time, date: new Date(t).toISOString().slice(0, 10) };
}
