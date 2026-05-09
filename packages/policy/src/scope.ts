export type Constraint = { key: string; value: string };

export type Scope = {
  resource: string;
  action: string;
  constraints: Constraint[];
};

const SCOPE_RE = /^([a-z][a-z0-9_*]*)\.([a-z][a-z0-9_*]*)(?::(.+))?$/;

export function parseScope(s: string): Scope {
  if (s === "*") return { resource: "*", action: "*", constraints: [] };
  const m = SCOPE_RE.exec(s);
  if (!m) throw new Error(`invalid scope: ${s}`);
  const [, resource, action, rest] = m;
  const constraints: Constraint[] = [];
  if (rest) {
    for (const part of rest.split(",")) {
      const eq = part.indexOf("=");
      if (eq < 1) throw new Error(`invalid constraint in scope: ${s}`);
      constraints.push({ key: part.slice(0, eq).trim(), value: part.slice(eq + 1).trim() });
    }
  }
  return { resource: resource!, action: action!, constraints };
}

export function formatScope(s: Scope): string {
  if (s.resource === "*" && s.action === "*") return "*";
  const head = `${s.resource}.${s.action}`;
  if (!s.constraints.length) return head;
  return `${head}:${s.constraints.map((c) => `${c.key}=${c.value}`).join(",")}`;
}
