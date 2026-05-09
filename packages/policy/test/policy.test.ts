import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScope, formatScope, satisfies, anyGrants, intersect } from "../src/index.js";

test("parse and format roundtrip", () => {
  for (const s of ["mail.read", "mail.send:to=*@acme.com", "payments.charge:max_usd=500,recipient=stripe", "*"]) {
    assert.equal(formatScope(parseScope(s)), s);
  }
});

test("invalid scopes throw", () => {
  assert.throws(() => parseScope("MAIL.read"));
  assert.throws(() => parseScope("mail"));
  assert.throws(() => parseScope("mail.send:badconstraint"));
});

test("wildcards satisfy", () => {
  assert.ok(anyGrants([parseScope("*")], "mail.read"));
  assert.ok(anyGrants([parseScope("mail.*")], "mail.send:to=a@b.com"));
});

test("constraints respected", () => {
  const grant = [parseScope("payments.charge:max_usd=500")];
  assert.ok(anyGrants(grant, parseScope("payments.charge:max_usd=200")));
  assert.ok(!anyGrants(grant, parseScope("payments.charge:max_usd=900")));
});

test("missing constraint on request fails when grant has constraint", () => {
  const grant = [parseScope("payments.charge:max_usd=500")];
  assert.ok(!anyGrants(grant, parseScope("payments.charge")));
});

test("delegation intersect drops over-broad child scopes", () => {
  const parent = [parseScope("mail.read"), parseScope("mail.send:to=*@acme.com")];
  const child = [parseScope("mail.read"), parseScope("mail.send:to=*@evil.com"), parseScope("billing.read")];
  const out = intersect(parent, child).map(formatScope);
  assert.deepEqual(out, ["mail.read"]);
});
