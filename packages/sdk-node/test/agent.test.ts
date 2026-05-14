import { test } from "node:test";
import assert from "node:assert/strict";
import { Agent } from "../src/index.js";
import { verifyToken, TokenError } from "@marque/core";

test("Agent.fresh produces a stable id for the same keypair", () => {
  const a = Agent.fresh();
  assert.equal(a.id, a.id);
  assert.match(a.id, /^mq_[1-9A-HJ-NP-Za-km-z]+$/);
});

test("export then load round-trips identity", () => {
  const a = Agent.fresh();
  const exported = a.export();
  const b = Agent.load(exported);
  assert.equal(a.id, b.id);
});

test("mint produces a token that verifyToken accepts", () => {
  const a = Agent.fresh();
  const b = Agent.fresh();
  const tok = a.mint({ sub: b.id, scope: ["mail.read"], ttl: 60 });
  const claims = verifyToken(tok, a.keypair.publicKey);
  assert.equal(claims.iss, a.id);
  assert.equal(claims.sub, b.id);
  assert.deepEqual(claims.scope, ["mail.read"]);
});

test("delegate rejects child scope that exceeds parent", () => {
  const p = Agent.fresh();
  const w = Agent.fresh();
  const sub = Agent.fresh();
  const parent = p.mint({ sub: w.id, scope: ["mail.read"], ttl: 60 });
  assert.throws(
    () => w.delegate(parent, p.keypair.publicKey, { sub: sub.id, scope: ["mail.send:to=*@evil.com"], ttl: 30 }),
    /child scope exceeds parent/,
  );
});

test("delegate clamps TTL to parent expiry", () => {
  const p = Agent.fresh();
  const w = Agent.fresh();
  const sub = Agent.fresh();
  const parent = p.mint({ sub: w.id, scope: ["mail.read"], ttl: 60 });
  const child = w.delegate(parent, p.keypair.publicKey, { sub: sub.id, scope: ["mail.read"], ttl: 999_999 });
  const c = verifyToken(child, w.keypair.publicKey);
  const pc = verifyToken(parent, p.keypair.publicKey);
  assert.ok(c.exp <= pc.exp);
});

test("delegate fails when supplied parent public key does not match signer", () => {
  const p = Agent.fresh();
  const wrong = Agent.fresh();
  const w = Agent.fresh();
  const sub = Agent.fresh();
  const parent = p.mint({ sub: w.id, scope: ["mail.read"], ttl: 60 });
  assert.throws(
    () => w.delegate(parent, wrong.keypair.publicKey, { sub: sub.id, scope: ["mail.read"], ttl: 30 }),
    TokenError,
  );
});

test("delegate propagates parent jti into child claims", () => {
  const p = Agent.fresh();
  const w = Agent.fresh();
  const sub = Agent.fresh();
  const parent = p.mint({ sub: w.id, scope: ["mail.read"], ttl: 60 });
  const pc = verifyToken(parent, p.keypair.publicKey);
  const child = w.delegate(parent, p.keypair.publicKey, { sub: sub.id, scope: ["mail.read"], ttl: 30 });
  const cc = verifyToken(child, w.keypair.publicKey);
  assert.equal(cc.parent, pc.jti);
});

test("load rejects missing key material", () => {
  assert.throws(() => Agent.load({}), /missing key material/);
});
