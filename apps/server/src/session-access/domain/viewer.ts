import type { ViewerId } from './value-objects/identifiers.js';

export type ParticipantRole = 'controller' | 'observer';

export interface Viewer {
  readonly id: ViewerId;
  readonly role: ParticipantRole;
  readonly approvedAt: Date;
}
