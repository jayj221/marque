import { Scope, parseScope } from "./scope.js";

function globMatch(pattern: string, value: string): boolean {
  if (pattern === "*") return true;
  if (!pattern.includes("*")) return pattern === value;
  const re = new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
  return re.test(value);
}

function numLE(grant: string, request: string): boolean | null {
  const g = Number(grant), r = Number(request);
  if (Number.isFinite(g) && Number.isFinite(r)) return r <= g;
  return null;
}

function constraintSatisfied(grant: { key: string; value: string }, request: { key: string; value: string }): boolean {
  if (grant.key !== request.key) return false;
  if (grant.key.startsWith("max_") || grant.key === "max" || grant.key === "limit") {
    const n = numLE(grant.value, request.value);
    if (n !== null) return n;
  }
  return globMatch(grant.value, request.value);
}

export function satisfies(granted: Scope, requested: Scope): boolean {
  if (!globMatch(granted.resource, requested.resource)) return false;
  if (!globMatch(granted.action, requested.action)) return false;
  for (const gc of granted.constraints) {
    const rc = requested.constraints.find((c) => c.key === gc.key);
    if (!rc) return false;
    if (!constraintSatisfied(gc, rc)) return false;
  }
  return true;
}

export function anyGrants(granted: Scope[], requested: Scope | string): boolean {
  const r = typeof requested === "string" ? parseScope(requested) : requested;
  return granted.some((g) => satisfies(g, r));
}

export function intersect(parent: Scope[], child: Scope[]): Scope[] {
  return child.filter((c) => parent.some((p) => satisfies(p, c)));
}
