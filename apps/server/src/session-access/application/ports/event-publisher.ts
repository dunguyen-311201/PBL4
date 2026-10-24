import type { DomainEvent } from '../../domain/events.js';
import type { ApplicationEvent } from '../events.js';

export interface EventPublisher {
  publish(events: readonly (DomainEvent | ApplicationEvent)[]): Promise<void>;
}
