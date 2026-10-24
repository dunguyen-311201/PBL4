import type { Principal } from '../principal.js';

export interface TokenService {
  issueHost(sessionId: string, expiresAt: Date): string;
  issuePending(sessionId: string, joinRequestId: string, expiresAt: Date): string;
  issueViewer(sessionId: string, viewerId: string, expiresAt: Date): string;
  /** Throws Unauthorized when the token is missing, malformed, expired or badly signed. */
  verify(token: string): Principal;
}
