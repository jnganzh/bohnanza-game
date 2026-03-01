import { GameSession } from './GameSession.js';
import { roomManager } from '../socket/rooms.js';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes

class GameSessionStore {
  private sessions: Map<string, GameSession> = new Map();
  private lastActivity: Map<string, number> = new Map();

  constructor() {
    // Periodic cleanup of idle sessions
    setInterval(() => this.cleanupIdle(), CLEANUP_INTERVAL_MS);
  }

  get(roomId: string): GameSession | undefined {
    return this.sessions.get(roomId);
  }

  set(roomId: string, session: GameSession): void {
    this.sessions.set(roomId, session);
    this.lastActivity.set(roomId, Date.now());
  }

  delete(roomId: string): void {
    this.sessions.delete(roomId);
    this.lastActivity.delete(roomId);
  }

  has(roomId: string): boolean {
    return this.sessions.has(roomId);
  }

  /** Call whenever a game action occurs to reset the idle timer */
  touch(roomId: string): void {
    if (this.sessions.has(roomId)) {
      this.lastActivity.set(roomId, Date.now());
    }
  }

  private cleanupIdle(): void {
    const now = Date.now();
    for (const [roomId, lastTime] of this.lastActivity) {
      if (now - lastTime > IDLE_TIMEOUT_MS) {
        console.log(`Cleaning up idle game session: ${roomId}`);
        this.sessions.delete(roomId);
        this.lastActivity.delete(roomId);
        roomManager.setStatus(roomId, 'finished');
      }
    }
  }
}

export const gameSessionStore = new GameSessionStore();
