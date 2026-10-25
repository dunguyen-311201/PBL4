import { createHmac } from 'node:crypto';
import type { IceServer, IceServerProvider } from '../../application/ports/ice-server-provider.js';

export interface TurnConfig {
  /** STUN URLs, e.g. `['stun:stun.l.google.com:19302']`. */
  readonly stunUrls: readonly string[];
  /** TURN URLs, e.g. `['turn:turn.example.com:3478?transport=udp', 'turns:turn.example.com:443?transport=tcp']`. */
  readonly turnUrls: readonly string[];
  /** coturn `static-auth-secret`. Never returned or logged. */
  readonly turnSecret: string;
}

/**
 * ICE servers for one session, with short-lived TURN credentials following coturn's
 * "TURN REST API" (`use-auth-secret`): username = "<expiry unix seconds>:<sessionId>",
 * credential = base64(HMAC-SHA1(secret, username)). 05-security D5.
 */
export class TurnIceServerProvider implements IceServerProvider {
  private readonly stunUrls: readonly string[];
  private readonly turnUrls: readonly string[];
  private readonly turnSecret: string;

  constructor(config: TurnConfig) {
    if (config.turnUrls.length > 0 && !config.turnSecret) {
      throw new Error('turnSecret is required when turnUrls is configured');
    }
    for (const url of config.stunUrls) {
      if (!url.startsWith('stun:')) {
        throw new Error(`Invalid STUN URL: "${url}". STUN URLs must start with "stun:".`);
      }
    }
    for (const url of config.turnUrls) {
      if (!url.startsWith('turn:') && !url.startsWith('turns:')) {
        throw new Error(
          `Invalid TURN URL: "${url}". TURN URLs must start with "turn:" or "turns:".`,
        );
      }
    }

    // Own copies: later changes to the caller's arrays must not leak into sessions.
    this.stunUrls = [...config.stunUrls];
    this.turnUrls = [...config.turnUrls];
    this.turnSecret = config.turnSecret;
  }

  forSession(sessionId: string, expiresAt: Date): IceServer[] {
    const servers: IceServer[] = [];

    // Fresh arrays per call: one session's result must never change another's.
    if (this.stunUrls.length > 0) {
      servers.push({ urls: [...this.stunUrls] });
    }

    if (this.turnUrls.length > 0) {
      const username = `${Math.floor(expiresAt.getTime() / 1000)}:${sessionId}`;
      const credential = createHmac('sha1', this.turnSecret).update(username).digest('base64');
      servers.push({ urls: [...this.turnUrls], username, credential });
    }

    return servers;
  }
}
