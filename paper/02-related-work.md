# Related Work

This section is written to be useful to a reader, not exhaustive. It identifies what each line of prior work does well and what specifically it does not deliver for the problem in `00-problem.md`.

## Capability-based authorization

**Macaroons** (Birgisson, Politz, Erlingsson, Taly, Vrable, Lentczner, *NDSS 2014*). Bearer tokens with contextual caveats; third-party caveats permit attenuation by parties other than the issuer. Excellent fit for *what* an agent may do. Caveats are evaluated independently at each verifier, so a `"max_usd=500"` caveat is enforced per verifier, not across them. Macaroons is the substrate this work most closely extends.

**SPKI/SDSI** (Ellison et al., RFC 2693, 1999). Linked-local-name capability chains. Older, broader, but again silent on cross-verifier resource budgets.

**ZCAP-LD / UCAN** (Web of Trust community, 2021–). JSON-LD and JWT-flavored capability tokens with delegation. Same per-verifier limitation.

*Gap.* No primitive in this family enforces a budget across multiple verifiers without an external coordinator.

## Offline electronic cash

**Chaum, Fiat, Naor** (*CRYPTO '88*). Blind signatures with cut-and-choose; double-spending offline produces a transcript revealing the spender's identity. *Post hoc* detection only; no bound on overspend during the gossip window.

**Brands** (*CRYPTO '93*). Restrictive blind signatures. Same property: identification, not prevention.

**Compact e-cash** (Camenisch, Hohenberger, Lysyanskaya, *EUROCRYPT '05*). Issuer-issued wallets of $2^k$ coins, anonymous, with detection. Still requires deposit at a single bank; the bank is the role we are trying to eliminate from the hot path.

*Gap.* These schemes treat the issuer/bank as a single trust root for deposits. We have $n$ deposit points and need them to decide locally.

## Payment channels and DAG settlement

**Lightning Network** (Poon, Dryja, white paper 2016). HTLCs route payments through a network of pre-funded channels with on-chain dispute resolution. Gives strong off-chain guarantees but requires per-counterparty channel funding and an on-chain settlement layer.

**Bolt / zkChannels** (Green, Miers, *CCS '17*). Anonymous payment channels.

*Gap.* Channels assume long-lived bilateral relationships between agent and each resource server. For agents that may call any of $n$ servers a small number of times, the channel funding overhead dominates.

## Distributed rate limiting

**Raghavan, Vishwanath, Ramabhadran, Yocum, Snoeren** (*SIGCOMM '07*). Approximate a global rate budget across distributed gateways via periodic gossip of consumption. Honest-operator assumption.

**Cloud-native rate limiters** (Envoy global rate limit, Stripe's blog post on Doorman, 2020). Centralized counter consulted by every gateway; the central-coordinator solution we explicitly rule out.

*Gap.* No analysis of the byzantine case; gateways trust each other and the operator.

## Anonymous credentials with rate caps

**Privacy Pass** (Davidson, Goldberg, Sullivan, Tankersley, Valsorda, *PoPETs 2018*). Anonymous one-time-use tokens issued after a CAPTCHA. The tokens carry no value; the rate cap is implicit in issuance.

**Trust Tokens** (W3C draft). Similar shape.

*Gap.* These are token-bucket abstractions; the tokens are not fungible across enforcement points by design.

## Cryptographic budgets in recent literature

**Atomos** (Tomescu et al., 2023, on accountable resource consumption in blockchains). Closest in spirit; treats overspend as a slashable condition with on-chain proof. Requires a blockchain settlement layer.

**Verifiable rate-limited bearer credentials** (Tyagi, Celi, Ristenpart, Sullivan, Tessaro, Wood, *CCS '22* "PrivateStats" and follow-ons). Anonymous metered access. Single-verifier model.

*Gap.* The agent setting is not addressed in any of these explicitly. Whether the techniques transfer is an open question.

## Concrete gap this paper targets

| Requirement | Macaroons | E-cash | Channels | DRL | This paper |
|---|---|---|---|---|---|
| Multi-verifier budget | ✗ | partial | ✗ | ✓ (non-adversarial) | ✓ |
| No coordinator on hot path | ✓ | ✗ (deposit) | ✓ (post-channel) | partial | ✓ |
| Byzantine resource servers | ✗ | n/a | ✓ (via on-chain) | ✗ | ✓ |
| Bounded overspend in adversarial run | ✗ | ✗ | ✓ (via collateral) | ✗ | target |
| No on-chain settlement | ✓ | ✓ | ✗ | ✓ | target |

The combination — multi-verifier, no coordinator, byzantine-tolerant, bounded overspend, no chain — is the unfilled cell. Whether it is *achievable* with a useful bound is the technical question. The construction document, when written, will either exhibit a scheme that fills it or honestly report the impossibility.

## Caveat on this section

This is a working bibliography compiled by one person reading openly available sources. It is not a complete survey. Items that should be here but are not, as of this draft: the literature on accountable subgroups in signatures, the work on consensus-free counters by Almeida et al. on CRDTs in adversarial settings, and several recent agent-systems workshop papers I have not yet read carefully. These will be added before any submission.
