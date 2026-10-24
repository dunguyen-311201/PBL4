import type { ApplicationConfig } from './application-config.js';
import type {
  Clock,
  CodeGenerator,
  DeadlineScheduler,
  EventPublisher,
  IdGenerator,
  OtpGenerator,
  SecretHasher,
  SessionRepository,
  TokenService,
} from './ports/index.js';

/** Everything the use cases need, wired by the Nest module in production and by fakes in tests. */
export interface SessionAccessDeps {
  readonly repo: SessionRepository;
  readonly hasher: SecretHasher;
  readonly codes: CodeGenerator;
  readonly otps: OtpGenerator;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly tokens: TokenService;
  readonly publisher: EventPublisher;
  readonly scheduler: DeadlineScheduler;
  readonly config: ApplicationConfig;
}
