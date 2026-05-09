import { KeyObject } from "node:crypto";
import {
  Keypair, generateKeypair, exportPrivate, importPrivate, exportPublic, importPublic,
  AgentID, agentIdFromPublic, issueToken, verifyToken, TokenClaims,
} from "@marque/core";
import { Scope, parseScope, intersect } from "@marque/policy";

export type AgentConfig = {
  privateKeyPem?: string;
  publicKeyPem?: string;
};

export class Agent {
  readonly id: AgentID;
  readonly keypair: Keypair;

  private constructor(kp: Keypair) {
    this.keypair = kp;
    this.id = agentIdFromPublic(kp.publicKey);
  }

  static fresh(): Agent {
    return new Agent(generateKeypair());
  }

  static load(cfg: AgentConfig): Agent {
    if (!cfg.privateKeyPem || !cfg.publicKeyPem) throw new Error("missing key material");
    return new Agent({
      privateKey: importPrivate(cfg.privateKeyPem),
      publicKey: importPublic(cfg.publicKeyPem),
    });
  }

  export(): Required<AgentConfig> {
    return {
      privateKeyPem: exportPrivate(this.keypair.privateKey),
      publicKeyPem: exportPublic(this.keypair.publicKey),
    };
  }

  mint(args: { sub: AgentID; scope: string[]; ttl: number; aud?: string; parent?: string }): string {
    return issueToken(this.keypair.privateKey, {
      iss: this.id,
      sub: args.sub,
      aud: args.aud,
      scope: args.scope,
      ttl: args.ttl,
      parent: args.parent,
    });
  }

  delegate(parentToken: string, parentPub: KeyObject, child: { sub: AgentID; scope: string[]; ttl: number }): string {
    const parent = verifyToken(parentToken, parentPub);
    const granted = parent.scope.map(parseScope);
    const requested = child.scope.map(parseScope);
    const allowed = intersect(granted, requested);
    if (allowed.length !== requested.length) throw new Error("child scope exceeds parent");
    return this.mint({
      sub: child.sub,
      scope: child.scope,
      ttl: Math.min(child.ttl, parent.exp - Math.floor(Date.now() / 1000)),
      aud: parent.aud,
      parent: parent.jti,
    });
  }
}

export type { TokenClaims, Scope };
