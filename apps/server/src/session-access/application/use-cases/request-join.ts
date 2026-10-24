import { DomainError } from '../../../shared/errors/domain-error.js';
import { JoinRequestId } from '../../domain/value-objects/identifiers.js';
import { SessionCode } from '../../domain/value-objects/session-code.js';
import type { SessionAccessDeps } from '../deps.js';
import { InvalidCredentials } from '../errors.js';
import { commit } from '../support/session-access.js';
import { withRetry } from '../support/with-retry.js';

/**
 * Unknown codes are checked against a real hash made by the same hasher, so that path costs as
 * much as checking a real OTP. A plain string would be rejected by argon2 in microseconds and
 * reveal whether a code exists (05-security I4).
 */
const DUMMY_SECRET = '000000';

export interface RequestJoinCommand {
  code: string;
  otp: string;
  viewerIp: string;
}

export interface RequestJoinResult {
  joinRequestId: string;
  pendingToken: string;
  decisionDeadline: Date;
}

export class RequestJoin {
  private dummyHash: Promise<string> | undefined;

  constructor(private readonly deps: SessionAccessDeps) {}

  async execute(cmd: RequestJoinCommand): Promise<RequestJoinResult> {
    const joinRequestId = JoinRequestId.of(this.deps.ids.uuid());
    return withRetry(() => this.attempt(cmd, joinRequestId));
  }

  private async attempt(
    cmd: RequestJoinCommand,
    joinRequestId: JoinRequestId,
  ): Promise<RequestJoinResult> {
    const { deps } = this;
    const code = parseCode(cmd.code);
    const session = code === null ? null : await deps.repo.findByCode(code);
    if (session === null) {
      this.dummyHash ??= deps.hasher.hash(DUMMY_SECRET);
      await deps.hasher.verify(cmd.otp, await this.dummyHash);
      throw new InvalidCredentials('unknown or malformed session code');
    }

    const expected = session.version;
    const otpMatches = await deps.hasher.verify(cmd.otp, session.otp.hash);
    const result = session.requestJoin({
      otpMatches,
      viewerIp: cmd.viewerIp,
      joinRequestId,
      now: deps.clock.now(),
    });

    // A wrong guess still changes the session (counter, maybe Locked): save it before failing.
    await commit(deps, session, expected);
    if (!result.ok) throw new InvalidCredentials(result.error.code);

    const { decisionDeadline } = result.joinRequest;
    return {
      joinRequestId: joinRequestId.value,
      decisionDeadline,
      pendingToken: deps.tokens.issuePending(
        session.id.value,
        joinRequestId.value,
        decisionDeadline,
      ),
    };
  }
}

function parseCode(raw: string): SessionCode | null {
  try {
    return SessionCode.of(raw);
  } catch (error) {
    if (error instanceof DomainError) return null;
    throw error;
  }
}
