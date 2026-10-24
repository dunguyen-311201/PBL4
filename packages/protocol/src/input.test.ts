import { describe, expect, it } from 'vitest';
import { InputEvent, MAX_WHEEL_DELTA, POINTER_MOVE_CHANNEL_EVENTS } from './input.js';

const noMods = { shift: false, ctrl: false, alt: false, meta: false };

describe('InputEvent', () => {
  it.each([
    ['pointer move', { t: 'pm', x: 0.5, y: 0.25 }],
    ['pointer move at corners', { t: 'pm', x: 0, y: 1 }],
    ['pointer down', { t: 'pd', b: 'left', x: 0.1, y: 0.9 }],
    ['pointer up (middle)', { t: 'pu', b: 'middle', x: 0.1, y: 0.9 }],
    ['double click', { t: 'dc', b: 'left', x: 0.3, y: 0.3 }],
    ['wheel', { t: 'wh', dx: 0, dy: -120 }],
    ['key down', { t: 'kd', key: 'a', code: 'KeyA', mods: noMods }],
    ['key up with modifiers', { t: 'ku', key: 'C', code: 'KeyC', mods: { ...noMods, ctrl: true } }],
  ])('accepts %s', (_label, event) => {
    expect(InputEvent.safeParse(event).success).toBe(true);
  });

  it.each([
    ['x above 1 (coordinates are normalized, FR-22)', { t: 'pm', x: 1.01, y: 0.5 }],
    ['negative y', { t: 'pm', x: 0.5, y: -0.1 }],
    ['NaN coordinate', { t: 'pm', x: Number.NaN, y: 0.5 }],
    ['unknown button', { t: 'pd', b: 'back', x: 0.5, y: 0.5 }],
    ['wheel delta beyond limit', { t: 'wh', dx: 0, dy: MAX_WHEEL_DELTA + 1 }],
    ['empty key', { t: 'kd', key: '', code: 'KeyA', mods: noMods }],
    ['missing modifiers', { t: 'kd', key: 'a', code: 'KeyA' }],
    ['unknown type', { t: 'xx' }],
  ])('rejects %s', (_label, event) => {
    expect(InputEvent.safeParse(event).success).toBe(false);
  });

  it('sends only pointer moves on the unordered channel', () => {
    expect(POINTER_MOVE_CHANNEL_EVENTS).toEqual(['pm']);
  });
});
