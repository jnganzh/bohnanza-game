import { useGameStore } from './stores/useGameStore.js';
import { registerSocketListeners } from './socket/socketListeners.js';
import { socket } from './socket/socketClient.js';
import { LobbyScreen } from './components/Lobby/LobbyScreen.js';
import { GameBoard } from './components/Game/GameBoard.js';

// Register socket listeners at module load time, BEFORE connecting,
// so the 'connect' handler fires and sends the reconnect token.
registerSocketListeners();

// Now connect — the 'connect' listener will emit lobby:reconnect automatically.
socket.connect();

export function App() {
  const gameState = useGameStore((s) => s.gameState);

  if (gameState) {
    return <GameBoard />;
  }

  return <LobbyScreen />;
}
