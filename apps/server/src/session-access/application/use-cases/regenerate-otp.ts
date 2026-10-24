import type { SessionAccessDeps } from '../deps.js';
import type { Principal } from '../principal.js';
import { assertHost, commit, loadSession } from '../support/session-access.js';
import { withRetry } from '../support/with-retry.js';

export class RegenerateOtp {
  constructor(private readonly deps: SessionAccessDeps) {}

  async execute(cmd: { actor: Principal }): Promise<{ otp: string; otpExpiresAt: Date }> {
    assertHost(cmd.actor);
    const otp = this.deps.otps.next();
    const otpHash = await this.deps.hasher.hash(otp);

    return withRetry(async () => {
      const session = await loadSession(this.deps, cmd.actor.sessionId);
      const expected = session.version;
      session.regenerateOtp({ otpHash, now: this.deps.clock.now() });
      await commit(this.deps, session, expected);
      return { otp, otpExpiresAt: session.otp.expiresAt };
    });
  }
}
