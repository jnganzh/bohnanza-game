import { useState, useEffect } from 'react';
import { socket } from '../../socket/socketClient.js';
import { useLobbyStore } from '../../stores/useLobbyStore.js';
import './LobbyScreen.css';

export function LobbyScreen() {
  const {
    playerName,
    roomId,
    rooms,
    roomPlayers,
    maxPlayers,
    hostId,
    error,
    setPlayerName,
    setError,
  } = useLobbyStore();

  const [nameInput, setNameInput] = useState('');
  const [maxPlayersInput, setMaxPlayersInput] = useState(4);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
  }, []);

  const handleSetName = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
    }
  };

  const handleCreateRoom = () => {
    socket.emit('lobby:create-room', {
      playerName,
      maxPlayers: maxPlayersInput,
    });
    setJoined(true);
  };

  const handleJoinRoom = (id: string) => {
    socket.emit('lobby:join-room', { roomId: id, playerName });
    setJoined(true);
  };

  const handleLeaveRoom = () => {
    socket.emit('lobby:leave-room');
    setJoined(false);
    useLobbyStore.getState().reset();
  };

  const handleStartGame = () => {
    socket.emit('lobby:start-game');
  };

  // Landing / Name entry
  if (!playerName) {
    return (
      <div className="landing">
        <div className="landing-bg">
          <div className="hill hill-1"></div>
          <div className="hill hill-2"></div>
          <div className="hill hill-3"></div>
          <div className="sun"></div>
        </div>
        <div className="landing-content">
          <div className="title-area">
            <div className="bean-characters">
              <span className="bean-char bean-char-1">🫛</span>
              <span className="bean-char bean-char-2">🌻</span>
            </div>
            <h1 className="game-title">Bohnanza</h1>
            <p className="game-subtitle">Plant Beans</p>
          </div>
          <div className="landing-form">
            <input
              type="text"
              className="name-input"
              placeholder="Enter your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
              maxLength={20}
            />
            <button className="btn-primary btn-large" onClick={handleSetName} disabled={!nameInput.trim()}>
              START GAME
            </button>
          </div>
        </div>
        <div className="landing-ground">
          <div className="ground-beans">
            <span>🫘</span><span>🌱</span><span>🫘</span><span>🌱</span><span>🫘</span>
          </div>
        </div>
      </div>
    );
  }

  // Room lobby
  if (joined && roomId) {
    return (
      <div className="lobby">
        <h1 className="lobby-title">Bohnanza</h1>
        <div className="room-lobby">
          <h2 className="room-name">Room: {roomId.slice(0, 6)}</h2>
          <div className="player-slots">
            {Array.from({ length: maxPlayers }).map((_, i) => (
              <div
                key={i}
                className={`player-slot ${roomPlayers[i] ? 'filled' : 'empty'}`}
              >
                {roomPlayers[i] ? (
                  <>
                    <span className="player-name">
                      <span className="player-icon">🧑‍🌾</span>
                      {roomPlayers[i].name}
                    </span>
                    {roomPlayers[i].id === hostId && (
                      <span className="host-badge">Host</span>
                    )}
                  </>
                ) : (
                  <span className="waiting">
                    <span className="waiting-dot"></span>
                    Waiting for player...
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="room-actions">
            <button
              onClick={handleStartGame}
              disabled={roomPlayers.length < 2}
              className="btn-primary btn-large"
            >
              Start Game ({roomPlayers.length}/{maxPlayers})
            </button>
            <button onClick={handleLeaveRoom} className="btn-danger">
              Leave Room
            </button>
          </div>
          {roomPlayers.length < 2 && (
            <p className="hint">Need at least 2 players to start</p>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    );
  }

  // Room browser
  return (
    <div className="lobby">
      <h1 className="lobby-title">Bohnanza</h1>
      <p className="welcome">Welcome, <strong>{playerName}</strong>!</p>

      <div className="create-room">
        <h3 className="section-title">Create Room</h3>
        <div className="create-form">
          <label className="form-label">
            Players:
            <select
              className="form-select"
              value={maxPlayersInput}
              onChange={(e) => setMaxPlayersInput(Number(e.target.value))}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>
          <button className="btn-primary" onClick={handleCreateRoom}>Create Room</button>
        </div>
      </div>

      <div className="room-list">
        <h3 className="section-title">Available Rooms</h3>
        {rooms.length === 0 ? (
          <p className="no-rooms">No rooms yet. Create one to get started!</p>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="room-item">
              <div className="room-item-info">
                <span className="room-host">{room.hostName}'s room</span>
                <span className="room-count">{room.playerCount}/{room.maxPlayers} players</span>
              </div>
              <button
                className="btn-primary btn-sm"
                onClick={() => handleJoinRoom(room.id)}
                disabled={room.playerCount >= room.maxPlayers}
              >
                Join
              </button>
            </div>
          ))
        )}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
