import { createHash, KeyObject, sign, verify } from "node:crypto";
import { appendFileSync, readFileSync, existsSync } from "node:fs";

export type Entry = {
  seq: number;
  ts: number;
  prev: string;
  body: Record<string, unknown>;
};

export type SignedEntry = Entry & { hash: string; sig: string };

const GENESIS = "0".repeat(64);

function hashEntry(e: Entry): string {
  return createHash("sha256").update(canonical(e)).digest("hex");
}

function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  const keys = Object.keys(v as object).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical((v as Record<string, unknown>)[k])).join(",") + "}";
}

export class AuditLog {
  private seq = 0;
  private prev = GENESIS;

  constructor(private readonly path: string, private readonly signer: KeyObject) {
    if (existsSync(path)) {
      const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
      for (const line of lines) {
        const e = JSON.parse(line) as SignedEntry;
        this.seq = e.seq + 1;
        this.prev = e.hash;
      }
    }
  }

  append(body: Record<string, unknown>): SignedEntry {
    const entry: Entry = { seq: this.seq, ts: Date.now(), prev: this.prev, body };
    const hash = hashEntry(entry);
    const sig = sign(null, Buffer.from(hash, "hex"), this.signer).toString("base64url");
    const signed: SignedEntry = { ...entry, hash, sig };
    appendFileSync(this.path, JSON.stringify(signed) + "\n");
    this.seq++;
    this.prev = hash;
    return signed;
  }
}

export function verifyChain(path: string, verifier: KeyObject): { ok: true; count: number } | { ok: false; failedAt: number; reason: string } {
  if (!existsSync(path)) return { ok: true, count: 0 };
  const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
  let prev = GENESIS;
  for (let i = 0; i < lines.length; i++) {
    const e = JSON.parse(lines[i]!) as SignedEntry;
    if (e.seq !== i) return { ok: false, failedAt: i, reason: "seq mismatch" };
    if (e.prev !== prev) return { ok: false, failedAt: i, reason: "broken chain" };
    const expect = hashEntry({ seq: e.seq, ts: e.ts, prev: e.prev, body: e.body });
    if (expect !== e.hash) return { ok: false, failedAt: i, reason: "hash mismatch" };
    if (!verify(null, Buffer.from(e.hash, "hex"), verifier, Buffer.from(e.sig, "base64url"))) {
      return { ok: false, failedAt: i, reason: "bad signature" };
    }
    prev = e.hash;
  }
  return { ok: true, count: lines.length };
}
