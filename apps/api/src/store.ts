export type AgentRecord = {
  id: string;
  publicKeyPem: string;
  createdAt: number;
  label?: string;
};

export type Revocation = {
  jti: string;
  reason?: string;
  revokedAt: number;
};

export interface Store {
  putAgent(a: AgentRecord): Promise<void>;
  getAgent(id: string): Promise<AgentRecord | null>;
  listAgents(): Promise<AgentRecord[]>;
  revoke(r: Revocation): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
  listRevocations(): Promise<Revocation[]>;
}

export class MemoryStore implements Store {
  private agents = new Map<string, AgentRecord>();
  private revoked = new Map<string, Revocation>();

  async putAgent(a: AgentRecord) { this.agents.set(a.id, a); }
  async getAgent(id: string) { return this.agents.get(id) ?? null; }
  async listAgents() { return [...this.agents.values()]; }
  async revoke(r: Revocation) { this.revoked.set(r.jti, r); }
  async isRevoked(jti: string) { return this.revoked.has(jti); }
  async listRevocations() { return [...this.revoked.values()]; }
}
