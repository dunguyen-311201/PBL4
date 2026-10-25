import { createHmac } from 'node:crypto';
import type { IceServer, IceServerProvider } from '../../application/ports/ice-server-provider.js';

export interface TurnConfig {
  readonly stunUrls: readonly string[]; // e.g. ['stun:stun.l.google.com:19302']
  readonly turnUrls: readonly string[]; // e.g. ['turn:turn.example.com:3478?transport=udp', 'turns:turn.example.com:443?transport=tcp']
  readonly turnSecret: string; // static-auth-secret of coturn
}

export class TurnIceServerProvider implements IceServerProvider {
  constructor(private readonly config: TurnConfig) {
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
  }

  forSession(sessionId: string, expiresAt: Date): IceServer[] {
    const servers: IceServer[] = [];

    if (this.config.stunUrls.length > 0) {
      servers.push({
        urls: this.config.stunUrls,
      });
    }

    if (this.config.turnUrls.length > 0) {
      const unixSeconds = Math.floor(expiresAt.getTime() / 1000);
      const username = `${unixSeconds}:${sessionId}`;
      const credential = createHmac('sha1', this.config.turnSecret)
        .update(username)
        .digest('base64');

      servers.push({
        urls: this.config.turnUrls,
        username,
        credential,
      });
    }

    return servers;
  }
}
