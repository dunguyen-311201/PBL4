/** Hashes OTPs (argon2id in production). `verify` must run in constant time. */
export interface SecretHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}
