export interface IceServer {
  readonly urls: string | readonly string[];
  readonly username?: string;
  readonly credential?: string;
}

/** ICE servers handed to an approved viewer and to the host (ADR-002). */
export interface IceServerProvider {
  forSession(sessionId: string, expiresAt: Date): IceServer[];
}
