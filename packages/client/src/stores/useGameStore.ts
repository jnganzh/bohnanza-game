import { create } from 'zustand';
import type { ClientGameState, GamePhase } from '@bohnanza/shared';

interface GameStore {
  gameState: ClientGameState | null;
  isMyTurn: boolean;
  gameOver: boolean;
  finalScores: { playerId: string; name: string; gold: number; cardsInHand: number }[] | null;
  winnerId: string | null;
  actionError: string | null;

  setGameState: (state: ClientGameState) => void;
  setGameOver: (scores: { playerId: string; name: string; gold: number; cardsInHand: number }[], winnerId: string) => void;
  setActionError: (error: string | null) => void;
  clearGameState: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  isMyTurn: false,
  gameOver: false,
  finalScores: null,
  winnerId: null,
  actionError: null,

  setGameState: (state) =>
    set({
      gameState: state,
      isMyTurn: state.turn.activePlayerId === state.myId,
    }),

  setGameOver: (scores, winnerId) =>
    set({ gameOver: true, finalScores: scores, winnerId }),

  setActionError: (error) => set({ actionError: error }),

  clearGameState: () =>
    set({
      gameState: null,
      isMyTurn: false,
      gameOver: false,
      finalScores: null,
      winnerId: null,
      actionError: null,
    }),
}));
