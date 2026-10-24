/** Events produced by the application layer that do not change the aggregate (D5). */
export type ApplicationEvent = {
  readonly type: 'SessionExpiring';
  readonly sessionId: string;
  readonly occurredAt: Date;
  readonly expiresAt: Date;
};
