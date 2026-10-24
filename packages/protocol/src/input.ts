import { z } from 'zod';

/** Wheel deltas are clamped to this many pixels per event. */
export const MAX_WHEEL_DELTA = 1200;

const Unit = z.number().min(0).max(1);
const Button = z.enum(['left', 'middle', 'right']);
const Modifiers = z.object({
  shift: z.boolean(),
  ctrl: z.boolean(),
  alt: z.boolean(),
  meta: z.boolean(),
});
const WheelDelta = z.number().min(-MAX_WHEEL_DELTA).max(MAX_WHEEL_DELTA);
const KeyName = z.string().min(1).max(32);

/**
 * Viewer → Host input. Coordinates are normalized to [0, 1] of the displayed frame; the Host
 * converts them to its real resolution and DPI (FR-22). Field names are short because pointer
 * moves are sent ~60 times per second.
 */
export const InputEvent = z.discriminatedUnion('t', [
  z.object({ t: z.literal('pm'), x: Unit, y: Unit }),
  z.object({ t: z.literal('pd'), b: Button, x: Unit, y: Unit }),
  z.object({ t: z.literal('pu'), b: Button, x: Unit, y: Unit }),
  z.object({ t: z.literal('dc'), b: Button, x: Unit, y: Unit }),
  z.object({ t: z.literal('wh'), dx: WheelDelta, dy: WheelDelta }),
  z.object({ t: z.literal('kd'), key: KeyName, code: KeyName, mods: Modifiers }),
  z.object({ t: z.literal('ku'), key: KeyName, code: KeyName, mods: Modifiers }),
]);
export type InputEvent = z.infer<typeof InputEvent>;
export type InputEventType = InputEvent['t'];

/** DataChannel names (04-protocol §5.1). */
export const INPUT_CHANNEL = 'input' as const;
export const POINTER_CHANNEL = 'input-pointer' as const;

/** Events sent on the unordered, no-retransmit channel: only the latest position matters. */
export const POINTER_MOVE_CHANNEL_EVENTS: readonly InputEventType[] = ['pm'];
