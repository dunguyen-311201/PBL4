/**
 * Atomic save with optimistic concurrency (LLD session-access §7).
 *
 * KEYS[1] session key · KEYS[2] code key
 * ARGV[1] expected version (0 = new session) · ARGV[2] snapshot JSON · ARGV[3] TTL in ms
 * ARGV[4] '1' if the session is closed · ARGV[5] session id
 *
 * Returns 1 when saved, 0 on a version conflict. A closed session frees its code, but only if
 * the code still points at this session.
 */
export const SAVE_SESSION_LUA = `
local current = redis.call('GET', KEYS[1])
local expected = tonumber(ARGV[1])
if current then
  if cjson.decode(current).version ~= expected then return 0 end
elseif expected ~= 0 then
  return 0
end
redis.call('SET', KEYS[1], ARGV[2], 'PX', ARGV[3])
if ARGV[4] == '1' then
  if redis.call('GET', KEYS[2]) == ARGV[5] then redis.call('DEL', KEYS[2]) end
else
  redis.call('PEXPIRE', KEYS[2], ARGV[3])
end
return 1
`;
