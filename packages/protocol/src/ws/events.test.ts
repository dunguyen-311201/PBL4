import { describe, expect, it } from 'vitest';
import { CLIENT_COMMANDS, SERVER_EVENTS } from './events.js';

describe('event name registry', () => {
  it('uses <object>.<action> lowercase names (04-protocol §1)', () => {
    for (const name of [...Object.keys(CLIENT_COMMANDS), ...Object.keys(SERVER_EVENTS)]) {
      expect(name).toMatch(/^[a-z]+(\.[a-z]+)+$/);
    }
  });

  it('has a schema for every client command', () => {
    for (const [name, schema] of Object.entries(CLIENT_COMMANDS)) {
      expect(schema, name).toBeDefined();
    }
  });

  it('declares which actors may send each command', () => {
    expect(CLIENT_COMMANDS['join.approve'].actors).toEqual(['host']);
    expect(CLIENT_COMMANDS['session.terminate'].actors).toEqual(['host', 'viewer']);
    expect(CLIENT_COMMANDS['relay.input'].actors).toEqual(['viewer']);
  });
});
