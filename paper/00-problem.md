# Problem Statement

## Motivating scenario

A principal $P$ wishes to delegate to an autonomous agent $A$ the authority to spend up to $B$ units of some resource (USD, API tokens, compute-seconds) over a time window $W$. The expenditure is realized through calls to a set of resource servers $\mathcal{R} = \{R_1, \dots, R_n\}$ that do not coordinate synchronously with each other or with $P$ on the call path. Each $R_i$ must, on receipt of a request from $A$, decide *locally* whether to honor it.

We require the following at end of window $W$:

$$\sum_{i=1}^{n} \text{spent}(A, R_i) \le B + \varepsilon$$

for some adversary-dependent slack $\varepsilon$ that we will quantify rather than assume away.

A *trivial* solution is to require every $R_i$ to call a central ledger before honoring any spend. This (a) introduces a synchronous global bottleneck, (b) couples every resource server to one operator, and (c) provides no useful security if the ledger is compromised. We rule this out.

The interesting problem is whether $\varepsilon$ can be made small under adversarial conditions *without* such a coordinator on the hot path.

## System model

**Parties.** A principal $P$, an agent $A$, $n$ resource servers $R_1, \dots, R_n$, and an asynchronous gossip layer $\mathcal{G}$ through which $R_i$ exchange messages with bounded but unknown delay $\Delta$.

**Setup.** $P$ holds a long-term key pair $(\mathsf{sk}_P, \mathsf{pk}_P)$. Each $R_i$ knows $\mathsf{pk}_P$. $P$ issues to $A$ a *budget capability* $\mathsf{cap}$ binding $B$, $W$, $\mathcal{R}$, and an agent public key $\mathsf{pk}_A$.

**Spend.** When $A$ wishes to spend amount $a$ at $R_i$, it produces a *spend authorization* $\sigma$ over $(R_i, a, \text{nonce})$. $R_i$ runs a local verifier $\mathsf{Verify}(\mathsf{cap}, \sigma, \text{state}_i) \to \{\text{accept}, \text{reject}\}$ in time independent of $n$ and of remote state.

**Gossip.** $R_i$ may publish spend records to $\mathcal{G}$ asynchronously after honoring a request. Other servers eventually observe these records.

**Time.** We use partial synchrony à la Dwork–Lynch–Stockmeyer (1988): messages are eventually delivered but with no a priori bound on delay.

## Definitions

**Honest run.** All parties follow the protocol. We require:

> *Completeness.* For an honest $A$ whose total intended spend is at most $B$, every well-formed request is accepted by the addressed $R_i$.

**Adversarial run.** Some subset of parties is byzantine (see `01-threat-model.md`). We require:

> *Bounded overspend.* The total honored spend exceeds $B$ by at most $\varepsilon(n, f, \Delta, \rho)$, where $f$ is the number of byzantine resource servers, $\Delta$ is the worst-case gossip delay, and $\rho$ is the maximum per-call spend.

> *Identifiability.* If overspend occurs, the protocol produces a publicly verifiable transcript $\pi$ such that any third party can decide which party deviated.

> *Non-repudiation of the honest.* No transcript $\pi$ can be produced that falsely identifies an honest party as a deviator.

## Why this is not Macaroons + a counter

Macaroons attenuate authority with caveats. A "spending budget" caveat is expressible — but the caveat is enforced *per-server*, not across servers. Two servers each shown a token with `"max_usd=500"` will each independently allow $500. The protocol Marque ships today inherits this limitation; it is what motivates this paper.

## Why this is not e-cash

Chaum (1982, 1988) and Brands (1993) solved cryptographic anonymous spend with offline double-spend detection. Their schemes give *post hoc* identification of double-spenders but no a priori bound on overspend during a gossip window, and they assume a single issuing bank that is also the eventual deposit point — the role that, in our setting, we are trying to eliminate from the hot path. We will revisit this in `02-related-work.md`.

## Why this is not distributed rate limiting

Raghavan et al. (2007), and the operational literature that followed, give techniques for approximating a global rate budget across distributed enforcement points by gossip. They assume an honest-but-possibly-stale operator deployment. Our adversary controls some $R_i$. The slack analyses there do not survive byzantine resource servers.

## Open questions before construction

These are listed so that a construction is not chosen by accident.

1. Is a deterministic worst-case bound $\varepsilon$ achievable, or only a probabilistic one?
2. Does the bound improve if we permit one round of pre-spend gossip ("reservation") at the cost of one extra RTT before the first call to a previously unused $R_i$?
3. What is the minimum $\mathsf{pk}_P$ exposure: must $R_i$ trust $P$'s key online, or can it be a one-shot setup parameter?
4. Is privacy (one $R_i$ does not learn another's spend pattern) achievable without sacrificing identifiability?

The paper takes a position only after the threat model is fixed.
