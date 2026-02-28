import { GameSession } from './GameSession.js';

class GameSessionStore {
  private sessions: Map<string, GameSession> = new Map();

  get(roomId: string): GameSession | undefined {
    return this.sessions.get(roomId);
  }

  set(roomId: string, session: GameSession): void {
    this.sessions.set(roomId, session);
  }

  delete(roomId: string): void {
    this.sessions.delete(roomId);
  }

  has(roomId: string): boolean {
    return this.sessions.has(roomId);
  }
}

export const gameSessionStore = new GameSessionStore();
