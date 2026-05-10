export type RemoteCheckOptions = {
  apiBase: string;
  ttlMs?: number;
  fetchImpl?: typeof fetch;
};

export function remoteRevocationCheck(opts: RemoteCheckOptions) {
  const ttl = opts.ttlMs ?? 5_000;
  const cache = new Map<string, { revoked: boolean; until: number }>();
  const f = opts.fetchImpl ?? fetch;

  return async function isRevoked(jti: string): Promise<boolean> {
    const now = Date.now();
    const cached = cache.get(jti);
    if (cached && cached.until > now) return cached.revoked;
    const res = await f(`${opts.apiBase}/revocations`);
    if (!res.ok) return cached?.revoked ?? false;
    const list = (await res.json()) as { jti: string }[];
    const set = new Set(list.map((r) => r.jti));
    cache.set(jti, { revoked: set.has(jti), until: now + ttl });
    return set.has(jti);
  };
}
