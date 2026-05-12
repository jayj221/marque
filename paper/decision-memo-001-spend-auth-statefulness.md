# Decision Memo 001 — Statefulness of Spend Authorizations

**Status:** Open → Proposed: **Option C (forward-secure signatures)**, with Option B as a documented fallback.

**Context:** The open question in `01-threat-model.md`. If $\mathsf{sk}_A$ leaks mid-window, the choice of authorization scheme determines whether the leak bounds the damage or detonates the budget. This decision shapes the construction. It must be made before the construction is written.

---

## What we are choosing between

A spend authorization $\sigma$ is the bearer-checkable object an agent produces to convince $R_i$ to honor a request. Three structural options.

### A. Stateless single-key

Agent holds a long-lived $(\mathsf{sk}_A, \mathsf{pk}_A)$. Authorization is $\sigma = \mathsf{Sign}_{\mathsf{sk}_A}(R_i, a, \text{nonce}, \text{cap}\text{-id})$.

- *Agent state:* one key.
- *Concurrency:* trivial — any number of spawned sub-tasks sign independently.
- *Key leak:* catastrophic. Attacker can produce $\sigma$ for any unspent amount up to $B$ and race the legitimate agent.
- *Damage bound under leak:* only what the gossip layer can claw back. Lower bound on $\varepsilon$ degrades to the size of the remaining budget. We have effectively lost the property we wanted.

### B. Stateful: hash-chain or nullifier set

At issuance, $P$ embeds in $\mathsf{cap}$ either (i) a chain anchor $c_0$ where the agent later reveals $c_1, c_2, \dots$ with $H(c_i) = c_{i-1}$, or (ii) a Merkle root over $k$ pre-committed nullifiers; the agent reveals one nullifier per spend.

- *Agent state:* the chain position, or the unused-nullifier set. Must survive process restarts.
- *Concurrency:* hostile. Two threads of the agent must coordinate over the chain position or risk colliding nullifiers (server rejects the second).
- *Key leak (or chain-state leak):* attacker steals all unused nullifiers and can race the legitimate agent for *those specific* slots. Damage bound is the remaining nullifier count × per-spend cap.
- *State loss:* legitimate agent that loses local chain state is stuck — cannot re-derive without help from $P$.

### C. Forward-secure signatures

Agent's key evolves over time. At epoch $t$, the agent signs with $\mathsf{sk}_{A,t}$; after epoch $t$, $\mathsf{sk}_{A,t}$ is deleted and $\mathsf{sk}_{A,t+1}$ is derived from it via one-way evolution. A signature carries the epoch index; verifier accepts only if epoch is within the budget's window. Construction: Bellare and Miner (*CRYPTO '99*), Itkis and Reyzin (*CRYPTO '01*), Boyen et al. (*CCS '06*).

- *Agent state:* one key, evolved on a fixed schedule (e.g., minute-granular). No chain to walk, no nullifier set to track.
- *Concurrency:* trivial within an epoch — many signatures with the same $\mathsf{sk}_{A,t}$.
- *Key leak at time $\tau$:* attacker holds $\mathsf{sk}_{A,t}$ for $t \le \tau$ but cannot forge for $t > \tau$ because the forward direction is one-way. Damage bound is the budget spent within the leaked epoch's window.
- *Cost:* signatures and keys are 2–10× larger than Ed25519 in known constructions; signing is slower; the scheme is non-standard, so libraries are thin.

---

## Tradeoff matrix

Scored 1 (bad) to 5 (good). Subjective but explicit.

| Property | A: Stateless | B: Chain / nullifier | C: Forward-secure |
|---|---|---|---|
| Damage bound under key leak | 1 | 4 | 5 |
| Damage bound under state loss | 5 (n/a) | 1 | 5 (n/a) |
| Concurrency / parallel agent threads | 5 | 1 | 5 |
| Implementation simplicity | 5 | 3 | 2 |
| Library maturity (Ed25519-class) | 5 | 4 | 2 |
| Server-side verification cost | 5 | 4 | 3 |
| Suitable for LLM-driven agents that leak state into prompts | 1 | 2 | 5 |
| Forensic identifiability of double-spend | 3 | 5 | 4 |

The last row matters. B is uniquely strong on identifiability because a reused nullifier is a self-evident proof of agent misbehavior, signable into a transcript. C identifies the leaked-epoch window but not the exact double-spender if the leak is silent. A identifies nothing useful.

The agent-as-LLM row matters more than it looks. The realistic deployment is an agent whose state is co-resident with its context window. Anything written to "agent state" is one prompt-injection away from exfiltration. C is the only option whose state is *temporally bounded by construction* — the leaked secret is stale by the time an attacker tries to use it on a slow channel.

---

## Why not Option A

It is tempting because Ed25519 already works in `@marque/core`. The reason to reject it is not implementation cost. It is that the threat model in `01-threat-model.md` *explicitly* drops the assumption that agent secret storage is isolated. Option A's security collapses to "as good as the agent's secrets are private," which is the assumption we agreed not to make. Choosing A would be choosing a different threat model than the one we wrote down, which is a research-integrity failure even before it is an engineering one.

## Why not Option B as primary

Two problems. First, the agent-state-loss case is real: agents crash, restart, are reincarnated as a fresh process by an orchestrator that does not know about Marque. A primitive whose legitimate happy path can wedge on a process restart is a primitive that resource owners will not adopt. Second, the concurrency cost is severe: real agent runtimes spawn parallel tool calls (the entire point of agent frameworks like LangGraph and ADK). Forcing serialization through a single chain pointer reintroduces a coordinator inside the agent process, which is a poor look.

B does have a real strength — identifiability — that we want to retain. The proposal below preserves it.

## Why C, with one caveat

Forward-secure signatures solve the *exact* threat the threat model raised. They cost more in bytes and cycles. The cost is acceptable in the agent setting because spend authorizations are not high-QPS objects: an agent might produce tens to thousands per hour, not millions per second. A 2–10× constant on a low-frequency operation is not what bottlenecks anything.

The caveat is library maturity. The well-known constructions (Bellare–Miner, Itkis–Reyzin) are old and standard in cryptography but do not have a battle-tested OpenSSL-grade implementation in mainstream languages. We will likely have to either (i) implement carefully against the published scheme, with test vectors, or (ii) use a hierarchical-identity-based-encryption-derived scheme via an existing pairing library (mcl, blst).

**Empirical sub-question** that the construction document will have to answer: what is the actual signature size, verify time, and key-evolution time for an Itkis–Reyzin instantiation at 128-bit security with minute-granular epochs over a 30-day window? If verify exceeds (say) 500 μs we may need to reconsider; if it is comfortably under, C is unambiguously the right call. This benchmark is the first artifact the construction work produces.

## Proposed hybrid (the actual recommendation)

Use C as the **outer envelope** and embed a B-style nullifier in each spend authorization as the **inner content**.

- The outer signature is forward-secure, providing temporal damage bounding.
- The inner nullifier is a one-time identifier scoped to the authorization, providing self-evident identifiability of any cross-server reuse.

The nullifier in the hybrid is not load-bearing for damage-bounding (the forward-secure signature is), so it does not have to be pre-committed in a Merkle tree, and the agent does not have to maintain a nullifier set. It can be a random 128-bit string per authorization. Servers gossip nullifiers as part of normal spend records; a reused nullifier in two records signed with the *same* forward-secure epoch key is a public proof of agent misbehavior.

This gives:

- The damage bound of C against key leak.
- The identifiability of B against an actively double-spending agent.
- No agent-side state beyond the evolving key.
- Concurrent spends within an epoch with no coordination.

The cost is that we accept the forward-secure library investment.

---

## Decision

**Adopt the hybrid: forward-secure outer signature + random per-call nullifier.**

**Fallback condition:** if the construction-phase benchmark shows forward-secure verify exceeds 500 μs at 128-bit security with the targeted epoch granularity on commodity hardware, downgrade to Option B (Merkle-rooted nullifier set with non-forward-secure outer signature), and explicitly weaken the threat model in §1 to assume agent secret storage is isolated. This weakening must be flagged in the abstract of any submission, not buried.

## Consequences

1. The construction document will assume a forward-secure signature scheme. The first artifact it produces is the benchmark above.
2. `@marque/core` today uses Ed25519. The forward-secure scheme will live in a new package `@marque/fsig` and will not replace Ed25519 for cap issuance — only for spend authorizations. Two-tier crypto: long-lived issuance keys are Ed25519, short-lived spend keys are forward-secure.
3. The empirical study (`05-empirical.md`) gains a question: do real agents actually spawn enough parallel calls to warrant choosing C over B? If they do not, the simplicity argument for B strengthens and we should know.

## Revisit conditions

This decision should be revisited if any of the following becomes true:

- The benchmark fails the 500 μs threshold and the fallback is exercised.
- A reviewer points out a forward-secure scheme with substantially better constants than Itkis–Reyzin that we missed.
- Empirical data shows agent parallelism is so low that the concurrency advantage of C over B is negligible.
- A scheme is proposed that gives temporal damage-bounding *without* forward-secure machinery (e.g., a clever use of verifiable delay functions or time-lock puzzles applied to capability state). This would be a significant find and would change the construction.
