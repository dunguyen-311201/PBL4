import { ConcurrencyConflict } from '../../src/session-access/application/errors.js';
import type { ApplicationEvent } from '../../src/session-access/application/events.js';
import type {
  Clock,
  CodeGenerator,
  DeadlineKind,
  DeadlineScheduler,
  EventPublisher,
  IdGenerator,
  OtpGenerator,
  SecretHasher,
  SessionRepository,
  TokenService,
} from '../../src/session-access/application/ports/index.js';
import type { Principal } from '../../src/session-access/application/principal.js';
import type { DomainEvent } from '../../src/session-access/domain/events.js';
import {
  RemoteSession,
  type RemoteSessionSnapshot,
} from '../../src/session-access/domain/remote-session.js';
import { SessionId } from '../../src/session-access/domain/value-objects/identifiers.js';
import type { SessionCode } from '../../src/session-access/domain/value-objects/session-code.js';

/** Shared, ordered record of side effects so tests can assert save → schedule → publish. */
export class CallLog {
  readonly calls: string[] = [];
  add(call: string): void {
    this.calls.push(call);
  }
}

/** Stores snapshots (a JSON round-trip, like Redis) and enforces optimistic concurrency. */
export class InMemorySessionRepository implements SessionRepository {
  private readonly byId = new Map<string, string>();
  private readonly codes = new Map<string, string>();
  /** Lets a test make the next `save` lose a race. */
  failNextSaveWithConflict = false;

  constructor(private readonly log = new CallLog()) {}

  findById(id: SessionId): Promise<RemoteSession | null> {
    const json = this.byId.get(id.value);
    return Promise.resolve(
      json === undefined ? null : RemoteSession.restore(JSON.parse(json) as RemoteSessionSnapshot),
    );
  }

  findByCode(code: SessionCode): Promise<RemoteSession | null> {
    const id = this.codes.get(code.value);
    return id === undefined ? Promise.resolve(null) : this.findById(SessionId.of(id));
  }

  save(session: RemoteSession, expectedVersion: number): Promise<void> {
    const current = this.byId.get(session.id.value);
    const currentVersion =
      current === undefined ? 0 : (JSON.parse(current) as RemoteSessionSnapshot).version;
    if (this.failNextSaveWithConflict || currentVersion !== expectedVersion) {
      this.failNextSaveWithConflict = false;
      return Promise.reject(new ConcurrencyConflict('version mismatch'));
    }
    this.byId.set(session.id.value, JSON.stringify(session.toSnapshot()));
    this.log.add(`save:${session.status}`);
    return Promise.resolve();
  }

  reserveCode(code: SessionCode, id: SessionId): Promise<boolean> {
    if (this.codes.has(code.value)) return Promise.resolve(false);
    this.codes.set(code.value, id.value);
    return Promise.resolve(true);
  }

  /** Test helper: change a stored session behind the use case's back. */
  async mutate(id: SessionId, change: (s: RemoteSession) => void): Promise<void> {
    const session = await this.findById(id);
    if (session === null) throw new Error('no such session');
    const expected = session.version;
    change(session);
    await this.save(session, expected);
  }
}

/** Not a real hash: good enough to prove the plain OTP is never stored. */
export class FakeHasher implements SecretHasher {
  readonly verified: { plain: string; hash: string }[] = [];
  readonly hashed: string[] = [];
  hash(plain: string): Promise<string> {
    this.hashed.push(plain);
    return Promise.resolve(`hashed:${plain}`);
  }
  verify(plain: string, hash: string): Promise<boolean> {
    this.verified.push({ plain, hash });
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

export class SequenceGenerator implements CodeGenerator, OtpGenerator {
  private i = 0;
  constructor(private readonly values: readonly string[]) {}
  next(): string {
    const value = this.values[Math.min(this.i, this.values.length - 1)];
    this.i += 1;
    if (value === undefined) throw new Error('SequenceGenerator has no values');
    return value;
  }
}

/** Hands out the given ids in order, then deterministic UUID v4s. */
export class FixedIdGenerator implements IdGenerator {
  private i = 0;
  constructor(private readonly ids: readonly string[]) {}
  uuid(): string {
    const id = this.ids[this.i] ?? `00000000-0000-4000-8000-${String(this.i).padStart(12, '0')}`;
    this.i += 1;
    return id;
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return this.current;
  }
  set(date: Date): void {
    this.current = date;
  }
}

/** Tokens are readable strings so tests can assert what was issued and until when. */
export class FakeTokenService implements TokenService {
  issueHost(sessionId: string, expiresAt: Date): string {
    return `host:${sessionId}:${expiresAt.toISOString()}`;
  }
  issuePending(sessionId: string, joinRequestId: string, expiresAt: Date): string {
    return `pending:${sessionId}:${joinRequestId}:${expiresAt.toISOString()}`;
  }
  issueViewer(sessionId: string, viewerId: string, expiresAt: Date): string {
    return `viewer:${sessionId}:${viewerId}:${expiresAt.toISOString()}`;
  }
  verify(): Principal {
    throw new Error('not used by use cases');
  }
}

export class CollectingEventPublisher implements EventPublisher {
  readonly published: (DomainEvent | ApplicationEvent)[] = [];
  constructor(private readonly log = new CallLog()) {}
  publish(events: readonly (DomainEvent | ApplicationEvent)[]): Promise<void> {
    this.published.push(...events);
    this.log.add(`publish:${events.map((e) => e.type).join(',')}`);
    return Promise.resolve();
  }
  types(): string[] {
    return this.published.map((e) => e.type);
  }
}

export class ManualScheduler implements DeadlineScheduler {
  readonly deadlines = new Map<string, Date>();
  constructor(private readonly log = new CallLog()) {}
  schedule(sessionId: string, at: Date, kind: DeadlineKind): Promise<void> {
    this.deadlines.set(`${sessionId}:${kind}`, at);
    this.log.add(`schedule:${kind}`);
    return Promise.resolve();
  }
  cancel(sessionId: string): Promise<void> {
    for (const key of [...this.deadlines.keys()])
      if (key.startsWith(`${sessionId}:`)) this.deadlines.delete(key);
    this.log.add('cancel');
    return Promise.resolve();
  }
  get(sessionId: string, kind: DeadlineKind): Date | undefined {
    return this.deadlines.get(`${sessionId}:${kind}`);
  }
}
