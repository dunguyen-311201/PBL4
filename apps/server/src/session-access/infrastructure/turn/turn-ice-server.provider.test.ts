import { afterEach, describe, expect, it, vi } from 'vitest';
import { TurnIceServerProvider } from './turn-ice-server.provider.js';

describe('TurnIceServerProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('forSession', () => {
    it('matches the exact test vector for temporary TURN credentials', () => {
      // Arrange
      const turnSecret = 's3cret-turn-key';
      const sessionId = '5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b';
      const expiresAt = new Date('2026-10-24T12:00:00.000Z');
      const turnUrls = ['turn:turn.example.com:3478?transport=udp'];

      const provider = new TurnIceServerProvider({
        stunUrls: [],
        turnUrls,
        turnSecret,
      });

      // Act
      const [turnServer] = provider.forSession(sessionId, expiresAt);

      // Assert
      expect(turnServer).toBeDefined();
      expect(turnServer?.username).toBe('1792843200:5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b');
      expect(turnServer?.credential).toBe('8jApRNGz7QzNfABPvnYe/VCOgqU=');
    });

    it('floors fractional seconds in expiresAt (900ms rounds down to same Unix second)', () => {
      // Arrange
      const turnSecret = 's3cret-turn-key';
      const sessionId = '5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b';
      const expiresAtWithFraction = new Date('2026-10-24T12:00:00.900Z');

      const provider = new TurnIceServerProvider({
        stunUrls: [],
        turnUrls: ['turn:turn.example.com:3478'],
        turnSecret,
      });

      // Act
      const [turnServer] = provider.forSession(sessionId, expiresAtWithFraction);

      // Assert
      expect(turnServer?.username).toBe('1792843200:5b0c1a54-7f1e-4b8e-9f2a-1d3c4e5f6a7b');
      expect(turnServer?.credential).toBe('8jApRNGz7QzNfABPvnYe/VCOgqU=');
    });

    it('returns only STUN when turnUrls is empty without username or credential', () => {
      // Arrange
      const stunUrls = ['stun:stun.l.google.com:19302'];
      const provider = new TurnIceServerProvider({
        stunUrls,
        turnUrls: [],
        turnSecret: '',
      });

      // Act
      const servers = provider.forSession('any-session-id', new Date());

      // Assert
      expect(servers).toEqual([
        {
          urls: stunUrls,
        },
      ]);
      expect(servers[0]?.username).toBeUndefined();
      expect(servers[0]?.credential).toBeUndefined();
    });

    it('returns only TURN when stunUrls is empty with username and credential', () => {
      // Arrange
      const turnUrls = [
        'turn:turn.example.com:3478?transport=udp',
        'turns:turn.example.com:443?transport=tcp',
      ];
      const provider = new TurnIceServerProvider({
        stunUrls: [],
        turnUrls,
        turnSecret: 'my-secret',
      });

      // Act
      const servers = provider.forSession('session-123', new Date('2026-10-24T12:00:00.000Z'));

      // Assert
      expect(servers).toHaveLength(1);
      expect(servers[0]?.urls).toEqual(turnUrls);
      expect(servers[0]?.username).toBe('1792843200:session-123');
      expect(servers[0]?.credential).toBeDefined();
    });

    it('returns both STUN and TURN in order (STUN first, TURN second)', () => {
      // Arrange
      const stunUrls = ['stun:stun.l.google.com:19302'];
      const turnUrls = ['turn:turn.example.com:3478'];
      const provider = new TurnIceServerProvider({
        stunUrls,
        turnUrls,
        turnSecret: 'top-secret',
      });

      // Act
      const servers = provider.forSession('session-1', new Date());

      // Assert
      expect(servers).toHaveLength(2);
      expect(servers[0]?.urls).toEqual(stunUrls);
      expect(servers[0]?.username).toBeUndefined();
      expect(servers[1]?.urls).toEqual(turnUrls);
      expect(servers[1]?.username).toBeDefined();
      expect(servers[1]?.credential).toBeDefined();
    });

    it('returns an empty array when both stunUrls and turnUrls are empty', () => {
      // Arrange
      const provider = new TurnIceServerProvider({
        stunUrls: [],
        turnUrls: [],
        turnSecret: '',
      });

      // Act
      const servers = provider.forSession('any-id', new Date());

      // Assert
      expect(servers).toEqual([]);
    });

    it('never leaks the turnSecret into the returned objects or JSON serialization', () => {
      // Arrange
      const turnSecret = 'super-confidential-secret-key';
      const provider = new TurnIceServerProvider({
        stunUrls: ['stun:stun.example.com:3478'],
        turnUrls: ['turn:turn.example.com:3478'],
        turnSecret,
      });

      // Act
      const servers = provider.forSession('session-leak-check', new Date());
      const json = JSON.stringify(servers);

      // Assert
      expect(json).not.toContain(turnSecret);
    });
  });

  describe('isolation between sessions', () => {
    it('does not let one session change the servers handed to the next', () => {
      // Arrange
      const provider = new TurnIceServerProvider({
        stunUrls: ['stun:stun.example.com:3478'],
        turnUrls: ['turn:turn.example.com:3478'],
        turnSecret: 'secret',
      });
      const first = provider.forSession('session-1', new Date());

      // Act
      (first[0]?.urls as string[]).push('stun:evil.example:3478');
      (first[1]?.urls as string[]).push('turn:evil.example:3478');
      const second = provider.forSession('session-2', new Date());

      // Assert
      expect(second[0]?.urls).toEqual(['stun:stun.example.com:3478']);
      expect(second[1]?.urls).toEqual(['turn:turn.example.com:3478']);
    });

    it('is not affected by later changes to the config arrays it was built from', () => {
      // Arrange
      const stunUrls = ['stun:stun.example.com:3478'];
      const turnUrls = ['turn:turn.example.com:3478'];
      const provider = new TurnIceServerProvider({ stunUrls, turnUrls, turnSecret: 'secret' });

      // Act
      stunUrls.push('stun:evil.example:3478');
      turnUrls.push('turn:evil.example:3478');
      const servers = provider.forSession('session-1', new Date());

      // Assert
      expect(servers[0]?.urls).toEqual(['stun:stun.example.com:3478']);
      expect(servers[1]?.urls).toEqual(['turn:turn.example.com:3478']);
    });
  });

  describe('constructor validation', () => {
    it('throws Error if turnUrls is non-empty but turnSecret is empty', () => {
      // Act & Assert
      expect(
        () =>
          new TurnIceServerProvider({
            stunUrls: [],
            turnUrls: ['turn:turn.example.com:3478'],
            turnSecret: '',
          }),
      ).toThrow(/turnSecret is required/);
    });

    it('throws Error if stunUrls contains a non-stun URL', () => {
      // Act & Assert
      expect(
        () =>
          new TurnIceServerProvider({
            stunUrls: ['turn:turn.example.com:3478'],
            turnUrls: [],
            turnSecret: '',
          }),
      ).toThrow(/Invalid STUN URL/);
    });

    it('throws Error if turnUrls contains a URL not starting with turn: or turns:', () => {
      // Act & Assert: http URL
      expect(
        () =>
          new TurnIceServerProvider({
            stunUrls: [],
            turnUrls: ['http://turn.example.com:3478'],
            turnSecret: 'secret',
          }),
      ).toThrow(/Invalid TURN URL/);

      // Act & Assert: stun URL in turnUrls
      expect(
        () =>
          new TurnIceServerProvider({
            stunUrls: [],
            turnUrls: ['stun:stun.example.com:3478'],
            turnSecret: 'secret',
          }),
      ).toThrow(/Invalid TURN URL/);
    });

    it('accepts both turn: and turns: in turnUrls', () => {
      // Act & Assert
      expect(
        () =>
          new TurnIceServerProvider({
            stunUrls: ['stun:stun.example.com:3478'],
            turnUrls: ['turn:turn.example.com:3478', 'turns:turn.example.com:443'],
            turnSecret: 'secret',
          }),
      ).not.toThrow();
    });
  });
});
