# Bounded-Overspend Capabilities for Autonomous Agents

A research artifact built on top of Marque. The goal is a primitive that lets a principal hand an agent a *spending budget* — a capability that authorizes up to B units of expenditure across an arbitrary set of resource servers — and have that budget enforced cryptographically, with bounded overspend, **without a synchronous central coordinator on the hot path.**

This is not the same problem as token-based authorization (Macaroons, OAuth). Those primitives express *what* an agent may do; they say nothing about *how much* across *how many* uncoordinated enforcement points.

## Status of the writeup

| Doc | What | Status |
|---|---|---|
| `00-problem.md` | System model, definitions, problem statement | draft |
| `01-threat-model.md` | Adversary model, trust assumptions | draft |
| `02-related-work.md` | Prior art and identified gaps | draft |
| `03-construction.md` | Construction sketch | not started — deliberately |
| `04-evaluation.md` | Evaluation methodology | not started |
| `05-empirical.md` | Empirical study of MCP scope usage | not started |

Construction is intentionally not written yet. The threat model has to bind it.

## Posture

This is a research log written in public, not a finished paper. Open questions are listed openly. If you read it and find a flaw, please file an issue.
