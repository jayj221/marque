import { KeyObject } from "node:crypto";
import { verifyToken, TokenClaims } from "@marque/core";
import { anyGrants, parseScope } from "@marque/policy";

export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
};

export type AuthContext = {
  claims: TokenClaims;
  scopeFor: (tool: string, args?: Record<string, unknown>) => string;
};

export type ResolveKey = (issuer: string) => Promise<KeyObject> | KeyObject;

export type GuardOptions = {
  resolveIssuerKey: ResolveKey;
  audience?: string;
  scopeFor?: (tool: string, args?: Record<string, unknown>) => string;
  onAudit?: (event: AuditEvent) => void | Promise<void>;
};

export type AuditEvent = {
  ts: number;
  agent: string;
  tool: string;
  args?: Record<string, unknown>;
  decision: "allow" | "deny";
  reason?: string;
  jti: string;
};

const defaultScopeFor = (tool: string) => {
  const [resource, action] = tool.split(".", 2);
  return action ? `${resource}.${action}` : `${tool}.invoke`;
};

export class AuthError extends Error {
  constructor(message: string, readonly code: "missing_token" | "invalid_token" | "wrong_audience" | "insufficient_scope") {
    super(message);
  }
}

export function createMcpGuard(opts: GuardOptions) {
  const scopeFor = opts.scopeFor ?? defaultScopeFor;

  return async function guard(token: string | undefined, call: ToolCall): Promise<AuthContext> {
    if (!token) throw new AuthError("missing token", "missing_token");
    let claims: TokenClaims;
    try {
      const pub = await opts.resolveIssuerKey(extractIssuer(token));
      claims = verifyToken(token, pub);
    } catch (e) {
      await emit(opts, { ts: Date.now(), agent: "?", tool: call.name, decision: "deny", reason: (e as Error).message, jti: "?" });
      throw new AuthError((e as Error).message, "invalid_token");
    }
    if (opts.audience && claims.aud && claims.aud !== opts.audience) {
      await emit(opts, evt(claims, call, "deny", "wrong_audience"));
      throw new AuthError("wrong audience", "wrong_audience");
    }
    const required = scopeFor(call.name, call.arguments);
    if (!anyGrants(claims.scope.map(parseScope), required)) {
      await emit(opts, evt(claims, call, "deny", `requires ${required}`));
      throw new AuthError(`insufficient scope: ${required}`, "insufficient_scope");
    }
    await emit(opts, evt(claims, call, "allow"));
    return { claims, scopeFor };
  };
}

function evt(c: TokenClaims, call: ToolCall, decision: "allow" | "deny", reason?: string): AuditEvent {
  return { ts: Date.now(), agent: c.sub, tool: call.name, args: call.arguments, decision, reason, jti: c.jti };
}

async function emit(opts: GuardOptions, e: AuditEvent) {
  if (opts.onAudit) await opts.onAudit(e);
}

function extractIssuer(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString());
  return claims.iss;
}

