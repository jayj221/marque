import { Agent } from "@marque/sdk-node";

const base = process.env.API ?? "http://localhost:4000";
const principal = Agent.fresh();
const worker = Agent.fresh();

const reg = await fetch(`${base}/agents`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ publicKeyPem: principal.export().publicKeyPem, label: "principal" }),
});
console.log("register principal:", reg.status, (await reg.json()).id);

const tok = principal.mint({ sub: worker.id, scope: ["mail.read"], ttl: 60, aud: "mcp://gmail" });

const v1 = await fetch(`${base}/tokens/verify`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: tok }),
});
const v1body = await v1.json();
console.log("verify (fresh):", v1.status, v1body.ok ? `ok jti=${v1body.claims.jti}` : v1body);

const rev = await fetch(`${base}/tokens/revoke`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ jti: v1body.claims.jti, reason: "smoke test" }),
});
console.log("revoke:", rev.status);

const v2 = await fetch(`${base}/tokens/verify`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ token: tok }),
});
console.log("verify (after revoke):", v2.status, await v2.json());
