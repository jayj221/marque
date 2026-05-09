import { sign, verify, KeyObject, randomBytes } from "node:crypto";
import { AgentID } from "./identity.js";

export type Scope = string;

export type TokenClaims = {
  iss: AgentID;
  sub: AgentID;
  aud?: string;
  scope: Scope[];
  iat: number;
  exp: number;
  jti: string;
  parent?: string;
};

const HEADER = { alg: "EdDSA", typ: "MQT" };

function b64u(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64u(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export type IssueArgs = Omit<TokenClaims, "iat" | "exp" | "jti"> & {
  ttl: number;
  jti?: string;
  now?: number;
};

export function issueToken(priv: KeyObject, args: IssueArgs): string {
  const now = args.now ?? Math.floor(Date.now() / 1000);
  const claims: TokenClaims = {
    iss: args.iss,
    sub: args.sub,
    aud: args.aud,
    scope: args.scope,
    iat: now,
    exp: now + args.ttl,
    jti: args.jti ?? b64u(randomBytes(16)),
    parent: args.parent,
  };
  const h = b64u(Buffer.from(JSON.stringify(HEADER)));
  const p = b64u(Buffer.from(JSON.stringify(claims)));
  const sig = b64u(sign(null, Buffer.from(`${h}.${p}`), priv));
  return `${h}.${p}.${sig}`;
}

export class TokenError extends Error {}

export function verifyToken(token: string, pub: KeyObject, now?: number): TokenClaims {
  const parts = token.split(".");
  if (parts.length !== 3) throw new TokenError("malformed token");
  const [h, p, s] = parts as [string, string, string];
  const hdr = JSON.parse(unb64u(h).toString());
  if (hdr.alg !== "EdDSA" || hdr.typ !== "MQT") throw new TokenError("bad header");
  const ok = verify(null, Buffer.from(`${h}.${p}`), pub, unb64u(s));
  if (!ok) throw new TokenError("bad signature");
  const claims = JSON.parse(unb64u(p).toString()) as TokenClaims;
  const t = now ?? Math.floor(Date.now() / 1000);
  if (claims.exp <= t) throw new TokenError("expired");
  if (claims.iat > t + 30) throw new TokenError("issued in future");
  return claims;
}
