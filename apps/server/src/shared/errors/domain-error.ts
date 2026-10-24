/**
 * Base class for business-rule violations. `code` is stable and is mapped to a protocol error
 * code by the presentation layer (docs/04-protocol.md §7); `message` is for logs only.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
