# Threat Model

## Parties and trust

| Party | Trust | Justification |
|---|---|---|
| Principal $P$ | Trusted for budget issuance and audit | $P$ is the party whose budget is at risk; protecting $P$ from itself is out of scope |
| Agent $A$ | **Byzantine** | The agent is the entity being constrained; assume arbitrary deviation |
| Resource server $R_i$ | $n - f$ honest, $f$ byzantine | Standard $f$-of-$n$ byzantine assumption |
| Gossip layer $\mathcal{G}$ | Eventually delivers messages between honest parties; may delay byzantine messages | Partial synchrony, Dwork–Lynch–Stockmeyer 1988 |
| Network | Cannot forge signed messages; may reorder, drop temporarily, replay | Standard cryptographic adversary on the wire |
| Clock | Loosely synchronized to within $\delta$ for honest parties; byzantine parties may lie about local time | Standard NTP-grade assumption |

## Adversary capabilities

The adversary $\mathcal{A}$:

1. Controls $A$ in full: chooses spend amounts, recipients, ordering, and may withhold messages.
2. Controls up to $f$ resource servers $R_i$, each in full: may accept invalid spends, delay gossip arbitrarily, refuse to gossip, or fabricate spend records consistent with the protocol on inputs $\mathcal{A}$ chooses.
3. Schedules message delivery between honest parties subject to eventual delivery in time at most $\Delta$.
4. Is computationally bounded: polynomial-time, no break of underlying primitives (EUF-CMA signatures, collision-resistant hashing).
5. Knows $\mathsf{pk}_P$ and all public keys; does not know $\mathsf{sk}_P$ or the secret keys of honest parties.

## Adversary goals (what we must defend against)

**G1. Overspend.** Cause $\sum \text{spent}(A, R_i) > B + \varepsilon$ for some $\varepsilon$ larger than the bound the protocol claims.

**G2. Frame.** Produce a transcript $\pi$ that publicly identifies an honest party as having deviated.

**G3. Censor.** Cause an honest request from an honest $A$ to a single honest $R_i$ to be rejected when total prior spend is well below $B$. (We treat this as a liveness goal; defense is best-effort because a byzantine $R_i$ can always rate-limit itself.)

**G4. De-anonymize spend.** Let a curious $R_i$ learn which $R_j$ the agent has spent at and how much. (Privacy goal, optional.)

## What is out of scope

1. **A compromised principal.** If $\mathsf{sk}_P$ leaks, the adversary mints unlimited budgets. We require $\mathsf{sk}_P$ to live in an HSM or equivalent; protecting it is a deployment concern, not a protocol property.
2. **An honest agent with a buggy implementation.** We assume that if $A$ is honest it follows the protocol exactly. Defensive coding against accidental overspend by honest agents is an implementation matter (e.g., conservative bookkeeping in the SDK).
3. **Denial of service against the gossip layer itself.** If $\mathcal{G}$ never delivers, the bound degrades gracefully but we make no claim that it stays small in the limit $\Delta \to \infty$. We expect to characterize $\varepsilon$ as a function of $\Delta$.
4. **Side channels at resource servers** (timing, log inspection by sysadmins). Out of scope for this paper.
5. **The economic model.** We say nothing about how budgets are priced, billed, or denominated. The unit is abstract.

## Trust simplifications we deliberately do not make

- We **do not** assume a single trusted clock service. We assume only loose synchronization.
- We **do not** assume a quorum among resource servers. The interesting regime is one server deciding alone.
- We **do not** assume the agent has secret storage isolated from its prompt context. The agent may have its secret key leak into a log or another agent.

The last is the most uncomfortable assumption to drop and the most realistic to drop: in practice, LLM-driven agents leak their state. A construction that survives partial key exposure (e.g., one-time-use spend authorizations) is preferable to one that does not.

## Open: what to do about agent key exposure

If $\mathsf{sk}_A$ leaks mid-window, can we bound the damage?

- *Naive* answer: rotate. Requires $P$ to re-issue. Synchronous, expensive.
- *Better* answer (open): make spend authorizations one-time, derived from an internal counter or a hash chain anchored at $\mathsf{cap}$, so that an exfiltrated $\mathsf{sk}_A$ is useful only for spends not yet performed by the legitimate agent.

This question is the one most worth resolving before we settle the construction, because it changes the shape of the spend authorization fundamentally.
