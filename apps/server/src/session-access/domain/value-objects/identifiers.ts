import { InvalidIdentifier } from '../errors.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

abstract class Identifier {
  protected constructor(readonly value: string) {}

  protected static validate(value: string, kind: string): string {
    if (!UUID_V4.test(value)) throw new InvalidIdentifier(`${kind} must be a UUID v4`);
    return value.toLowerCase();
  }

  equals(other: Identifier): boolean {
    return other.constructor === this.constructor && other.value === this.value;
  }
}

export class SessionId extends Identifier {
  /** Nominal tag so different identifier types are not interchangeable. */
  readonly kind = 'SessionId' as const;
  static of(value: string): SessionId {
    return new SessionId(Identifier.validate(value, 'SessionId'));
  }
}

export class JoinRequestId extends Identifier {
  /** Nominal tag so different identifier types are not interchangeable. */
  readonly kind = 'JoinRequestId' as const;
  static of(value: string): JoinRequestId {
    return new JoinRequestId(Identifier.validate(value, 'JoinRequestId'));
  }
}

export class ViewerId extends Identifier {
  /** Nominal tag so different identifier types are not interchangeable. */
  readonly kind = 'ViewerId' as const;
  static of(value: string): ViewerId {
    return new ViewerId(Identifier.validate(value, 'ViewerId'));
  }
}
