import { generateKeyPairSync, createPrivateKey, createPublicKey, KeyObject } from "node:crypto";

export type Keypair = { privateKey: KeyObject; publicKey: KeyObject };

export function generateKeypair(): Keypair {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return { privateKey, publicKey };
}

export function exportPrivate(k: KeyObject): string {
  return k.export({ type: "pkcs8", format: "pem" }).toString();
}

export function exportPublic(k: KeyObject): string {
  return k.export({ type: "spki", format: "pem" }).toString();
}

export function importPrivate(pem: string): KeyObject {
  return createPrivateKey({ key: pem, format: "pem" });
}

export function importPublic(pem: string): KeyObject {
  return createPublicKey({ key: pem, format: "pem" });
}

export function publicRaw(k: KeyObject): Buffer {
  const der = k.export({ type: "spki", format: "der" });
  return der.subarray(der.length - 32);
}
