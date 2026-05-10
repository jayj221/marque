import { Agent } from "@marque/sdk-node";
import { createMcpGuard } from "@marque/mcp";

const principal = Agent.fresh();
const worker = Agent.fresh();

const root = principal.mint({
  sub: worker.id,
  scope: ["mail.read", "mail.send:to=*@acme.com", "payments.charge:max_usd=500"],
  ttl: 3600,
  aud: "mcp://gmail",
});

const subAgent = Agent.fresh();
const child = worker.delegate(root, principal.keypair.publicKey, {
  sub: subAgent.id,
  scope: ["mail.read"],
  ttl: 600,
});

const guard = createMcpGuard({
  resolveIssuerKey: async (iss) => (iss === worker.id ? worker.keypair.publicKey : principal.keypair.publicKey),
  audience: "mcp://gmail",
  onAudit: (e) => console.log(JSON.stringify(e)),
});

await guard(child, { name: "mail.read", arguments: { folder: "inbox" } });

try {
  await guard(child, { name: "mail.send", arguments: { to: "evil@phish.com" } });
} catch (e) {
  console.log("denied as expected:", (e as Error).message);
}
