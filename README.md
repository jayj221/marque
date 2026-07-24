# Marque

Identity, delegated permissions, and audit infrastructure for AI agents.

A *letter of marque* was a sovereign's signed authority granting a private agent the right to act on their behalf. Marque rebuilds that primitive for the agent economy: cryptographic identity, scoped delegation, revocable trust, immutable audit.

## Why

Agents in production today share hardcoded API keys, run with over-broad credentials, and leave no forensic trail. That works at pilot scale and breaks at production scale. Every regulated industry deploying agents (finance, health, legal, logistics) needs something that doesn't yet exist as standard infrastructure.

Marque is that layer.

## Status

Pre-alpha. Building in public.

## Packages

- `@marque/core`, identity primitives (Ed25519), permission tokens, signing
- `@marque/policy`, scope grammar, capability policies
- `@marque/sdk-node`, TypeScript SDK for agent runtimes
- `@marque/mcp`, drop-in auth middleware for MCP servers
- `@marque/audit`, append-only signed audit log

## License

Apache-2.0
