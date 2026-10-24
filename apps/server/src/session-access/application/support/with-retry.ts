import { ConcurrencyConflict } from '../errors.js';

/**
 * Runs `attempt` again once if another instance saved the session first. The attempt must
 * reload the session itself, so the retry sees the winner's state (02-domain-model §6).
 */
export async function withRetry<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (!(error instanceof ConcurrencyConflict)) throw error;
    return attempt();
  }
}
