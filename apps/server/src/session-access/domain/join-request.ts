import type { JoinRequestId } from './value-objects/identifiers.js';

export interface JoinRequest {
  readonly id: JoinRequestId;
  readonly viewerIp: string;
  readonly requestedAt: Date;
  readonly decisionDeadline: Date;
}
