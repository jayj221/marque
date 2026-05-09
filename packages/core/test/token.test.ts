import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeypair, agentIdFromPublic, issueToken, verifyToken, TokenError } from "../src/index.js";

test("round-trip token", () => {
  const kp = generateKeypair();
  const id = agentIdFromPublic(kp.publicKey);
  const tok = issueToken(kp.privateKey, { iss: id, sub: id, scope: ["mail.read"], ttl: 60 });
  const claims = verifyToken(tok, kp.publicKey);
  assert.equal(claims.iss, id);
  assert.deepEqual(claims.scope, ["mail.read"]);
});

test("expired token rejected", () => {
  const kp = generateKeypair();
  const id = agentIdFromPublic(kp.publicKey);
  const tok = issueToken(kp.privateKey, { iss: id, sub: id, scope: [], ttl: 1, now: 0 });
  assert.throws(() => verifyToken(tok, kp.publicKey, 100), TokenError);
});

test("tampered payload rejected", () => {
  const kp = generateKeypair();
  const id = agentIdFromPublic(kp.publicKey);
  const tok = issueToken(kp.privateKey, { iss: id, sub: id, scope: ["a"], ttl: 60 });
  const [h, , s] = tok.split(".");
  const evil = Buffer.from(JSON.stringify({ iss: id, sub: id, scope: ["b"], iat: 0, exp: 9e9, jti: "x" })).toString("base64url");
  assert.throws(() => verifyToken(`${h}.${evil}.${s}`, kp.publicKey), TokenError);
});

test("agent id stable for same key", () => {
  const kp = generateKeypair();
  assert.equal(agentIdFromPublic(kp.publicKey), agentIdFromPublic(kp.publicKey));
});
