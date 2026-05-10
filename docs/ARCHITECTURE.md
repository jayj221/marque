# Architecture

## Trust model

Three roles:

- **Principal** — a human or service that owns capabilities and delegates them
- **Agent** — a process that holds a private key and acts under delegated authority
- **Resource server** — exposes tools (typically via MCP) and enforces scope on each call

## Token

A Marque token is a compact 3-part string `header.claims.signature` signed with EdDSA.

```
{ alg: "EdDSA", typ: "MQT" }
.
{ iss, sub, aud?, scope[], iat, exp, jti, parent? }
.
<sig>
```

`iss` is the issuing agent's id. `sub` is the bearer. `parent` links a delegated token to the jti of the token it was minted from, enabling forensic tracing.

## Scope grammar

```
scope    := "*" | resource "." action ( ":" constraints )?
resource := [a-z][a-z0-9_*]*
action   := [a-z][a-z0-9_*]*
constraints := pair ( "," pair )*
pair     := key "=" value
```

Numeric keys (`max`, `limit`, `max_*`) are compared as numbers. All other values use glob match.

## Delegation

`Agent.delegate(parentToken, parentPub, child)` issues a token for `child` whose scope is the **intersection** of `parent.scope` and `child.scope`, and whose lifetime cannot exceed the parent's. A child can never escalate.

## Audit

Every guard call emits an event. The recommended sink is `@marque/audit`, which appends a signed, hash-chained record. Tamper, reorder, or forgery anywhere in the chain is detected by `verifyChain()`.

## Why MCP

MCP is the de-facto standard for exposing tools to agents. Marque ships a guard that wraps any MCP server's dispatch with one line, mapping `tool.name` to a required scope. Resource owners get auth, audit, and revocation without changing their tools.

## Non-goals (today)

- Replacing OAuth where humans are the principal — Marque is for non-human actors
- A new wire protocol — the token rides in any header MCP transports already support
- Storage of credentials — Marque issues attestations, never holds tool API keys
