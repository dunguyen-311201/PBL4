import { RemoteSession } from '../../domain/remote-session.js';
import { SessionId } from '../../domain/value-objects/identifiers.js';
import { SessionCode } from '../../domain/value-objects/session-code.js';
import type { SessionAccessDeps } from '../deps.js';
import { CodeSpaceExhausted } from '../errors.js';
import { commit } from '../support/session-access.js';

export interface CreateSessionResult {
  sessionId: string;
  code: string;
  /** Plain OTP: returned to the host once, never stored (I9). */
  otp: string;
  otpExpiresAt: Date;
  waitingExpiresAt: Date;
  hostToken: string;
}

export class CreateSession {
  constructor(private readonly deps: SessionAccessDeps) {}

  async execute(): Promise<CreateSessionResult> {
    const { deps } = this;
    const { policy } = deps.config;
    const now = deps.clock.now();
    const id = SessionId.of(deps.ids.uuid());
    const code = await this.reserveUniqueCode(id);
    const otp = deps.otps.next();

    const session = RemoteSession.create({
      id,
      code,
      otpHash: await deps.hasher.hash(otp),
      now,
      policy,
    });
    await commit(deps, session, 0);

    return {
      sessionId: id.value,
      code: code.value,
      otp,
      otpExpiresAt: session.otp.expiresAt,
      waitingExpiresAt: session.waitingExpiresAt,
      // Long enough for the longest possible session; access is re-checked on every command.
      hostToken: deps.tokens.issueHost(
        id.value,
        new Date(now.getTime() + policy.waitingTtlMs + policy.maxActiveDurationMs),
      ),
    };
  }

  private async reserveUniqueCode(id: SessionId): Promise<SessionCode> {
    const { codes, repo, config } = this.deps;
    for (let attempt = 0; attempt < config.maxCodeAttempts; attempt++) {
      const code = SessionCode.of(codes.next());
      if (await repo.reserveCode(code, id, config.policy.waitingTtlMs)) return code;
    }
    throw new CodeSpaceExhausted('Could not reserve a unique session code');
  }
}
