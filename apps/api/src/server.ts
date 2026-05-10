import Fastify, { FastifyInstance } from "fastify";
import { importPublic, verifyToken, agentIdFromPublic } from "@marque/core";
import { Store } from "./store.js";

export type ServerDeps = { store: Store };

export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: { level: "info" } });
  const { store } = deps;

  app.get("/health", async () => ({ ok: true, ts: Date.now() }));

  app.post<{ Body: { publicKeyPem: string; label?: string } }>("/agents", async (req, reply) => {
    const { publicKeyPem, label } = req.body ?? {};
    if (!publicKeyPem) return reply.code(400).send({ error: "publicKeyPem required" });
    let pub;
    try { pub = importPublic(publicKeyPem); } catch { return reply.code(400).send({ error: "invalid pem" }); }
    const id = agentIdFromPublic(pub);
    const rec = { id, publicKeyPem, label, createdAt: Date.now() };
    await store.putAgent(rec);
    return reply.code(201).send(rec);
  });

  app.get<{ Params: { id: string } }>("/agents/:id", async (req, reply) => {
    const a = await store.getAgent(req.params.id);
    if (!a) return reply.code(404).send({ error: "not found" });
    return a;
  });

  app.get("/agents", async () => store.listAgents());

  app.post<{ Body: { token: string } }>("/tokens/verify", async (req, reply) => {
    const { token } = req.body ?? {};
    if (!token) return reply.code(400).send({ error: "token required" });
    const iss = peekIssuer(token);
    if (!iss) return reply.code(400).send({ error: "malformed token" });
    const issuer = await store.getAgent(iss);
    if (!issuer) return reply.code(404).send({ error: "issuer unknown" });
    try {
      const claims = verifyToken(token, importPublic(issuer.publicKeyPem));
      if (await store.isRevoked(claims.jti)) return reply.code(403).send({ error: "revoked", jti: claims.jti });
      return { ok: true, claims };
    } catch (e) {
      return reply.code(401).send({ error: (e as Error).message });
    }
  });

  app.post<{ Body: { jti: string; reason?: string } }>("/tokens/revoke", async (req, reply) => {
    const { jti, reason } = req.body ?? {};
    if (!jti) return reply.code(400).send({ error: "jti required" });
    await store.revoke({ jti, reason, revokedAt: Date.now() });
    return reply.code(201).send({ ok: true });
  });

  app.get("/revocations", async () => store.listRevocations());

  return app;
}

function peekIssuer(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString());
    return typeof claims.iss === "string" ? claims.iss : null;
  } catch { return null; }
}
