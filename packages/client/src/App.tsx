import { useGameStore } from './stores/useGameStore.js';
import { registerSocketListeners } from './socket/socketListeners.js';
import { LobbyScreen } from './components/Lobby/LobbyScreen.js';
import { GameBoard } from './components/Game/GameBoard.js';

// Register socket listeners at module load time, BEFORE socket auto-connects,
// so no events are missed.
registerSocketListeners();

export function App() {
  const gameState = useGameStore((s) => s.gameState);

  if (gameState) {
    return <GameBoard />;
  }

  return <LobbyScreen />;
}
