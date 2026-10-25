import { randomUUID } from 'node:crypto';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { Redis } from 'ioredis';

/**
 * A real Redis for integration tests: REDIS_URL if set (e.g. a local redis-server), otherwise a
 * throwaway container via Testcontainers (needs Docker). docs/06-test-strategy.md §2.
 */
export async function startRedis(): Promise<{ url: string; stop: () => Promise<void> }> {
  const fromEnv = process.env.REDIS_URL;
  if (fromEnv !== undefined && fromEnv !== '')
    return { url: fromEnv, stop: () => Promise.resolve() };

  const container: StartedRedisContainer = await new RedisContainer('redis:7-alpine').start();
  return {
    url: container.getConnectionUrl(),
    stop: async () => {
      await container.stop();
    },
  };
}

export const connect = (url: string) =>
  new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 1 });

/** Every test gets its own key space so files can run in parallel against one Redis. */
export const uniquePrefix = () => `test:${randomUUID()}:`;
