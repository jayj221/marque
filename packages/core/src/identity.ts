import { createHash, KeyObject } from "node:crypto";
import { publicRaw } from "./keys.js";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function b58(buf: Buffer): string {
  let n = 0n;
  for (const b of buf) n = (n << 8n) | BigInt(b);
  let out = "";
  while (n > 0n) {
    const r = Number(n % 58n);
    out = ALPHABET[r] + out;
    n /= 58n;
  }
  for (const b of buf) {
    if (b !== 0) break;
    out = ALPHABET[0] + out;
  }
  return out;
}

export type AgentID = `mq_${string}`;

export function agentIdFromPublic(pub: KeyObject): AgentID {
  const raw = publicRaw(pub);
  const h = createHash("sha256").update(raw).digest().subarray(0, 20);
  return `mq_${b58(h)}` as AgentID;
}

export function isAgentID(s: string): s is AgentID {
  return /^mq_[1-9A-HJ-NP-Za-km-z]{20,40}$/.test(s);
}
