import {
  DEFAULT_APPLICATION_CONFIG,
  type ApplicationConfig,
} from '../../src/session-access/application/application-config.js';
import type { SessionAccessDeps } from '../../src/session-access/application/deps.js';
import type { Principal } from '../../src/session-access/application/principal.js';
import { SessionId } from '../../src/session-access/domain/value-objects/identifiers.js';
import { T0 } from '../builders/remote-session.builder.js';
import {
  CallLog,
  CollectingEventPublisher,
  FakeHasher,
  FakeTokenService,
  FixedClock,
  FixedIdGenerator,
  InMemorySessionRepository,
  ManualScheduler,
  SequenceGenerator,
} from './in-memory.js';

export const SESSION_ID = '5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b';
export const JOIN_REQUEST_ID = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';
export const VIEWER_ID = '0f9e8d7c-6b5a-4c3d-9e1f-2a3b4c5d6e7f';
export const CODE = '482915307';
export const OTP = '093184';
export const IP = '203.0.113.7';

export const HOST: Principal = { kind: 'host', sessionId: SESSION_ID };
export const VIEWER: Principal = { kind: 'viewer', sessionId: SESSION_ID, viewerId: VIEWER_ID };
export const PENDING: Principal = {
  kind: 'pending',
  sessionId: SESSION_ID,
  joinRequestId: JOIN_REQUEST_ID,
};

export interface Harness {
  deps: SessionAccessDeps;
  log: CallLog;
  repo: InMemorySessionRepository;
  hasher: FakeHasher;
  clock: FixedClock;
  publisher: CollectingEventPublisher;
  scheduler: ManualScheduler;
  sessionId: SessionId;
}

export function harness(
  options: { codes?: string[]; otps?: string[]; config?: Partial<ApplicationConfig> } = {},
): Harness {
  const log = new CallLog();
  const repo = new InMemorySessionRepository(log);
  const hasher = new FakeHasher();
  const clock = new FixedClock(T0);
  const publisher = new CollectingEventPublisher(log);
  const scheduler = new ManualScheduler(log);
  const deps: SessionAccessDeps = {
    repo,
    hasher,
    codes: new SequenceGenerator(options.codes ?? [CODE]),
    otps: new SequenceGenerator(options.otps ?? [OTP, '555111', '555222']),
    ids: new FixedIdGenerator([SESSION_ID, JOIN_REQUEST_ID, VIEWER_ID]),
    clock,
    tokens: new FakeTokenService(),
    publisher,
    scheduler,
    config: { ...DEFAULT_APPLICATION_CONFIG, ...options.config },
  };
  return {
    deps,
    log,
    repo,
    hasher,
    clock,
    publisher,
    scheduler,
    sessionId: SessionId.of(SESSION_ID),
  };
}
