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
  } = useLobbyStore();

  const [nameInput, setNameInput] = useState('');
  const [maxPlayersInput, setMaxPlayersInput] = useState(4);

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
  };

  const handleJoinRoom = (id: string) => {
    socket.emit('lobby:join-room', { roomId: id, playerName });
  };

  const handleLeaveRoom = () => {
    socket.emit('lobby:leave-room');
    useLobbyStore.getState().reset();
  };

  const handleDeleteRoom = () => {
    socket.emit('lobby:delete-room');
    useLobbyStore.getState().reset();
  };

  const handleChangeMaxPlayers = (newMax: number) => {
    socket.emit('lobby:change-max-players', { maxPlayers: newMax });
  };

  const handleStartGame = () => {
    socket.emit('lobby:start-game');
  };

  const handleAddBot = () => {
    socket.emit('lobby:add-bot');
  };

  const handleRemoveBot = (botId: string) => {
    socket.emit('lobby:remove-bot', { botId });
  };

  // Determine if current player is the host
  const myPlayer = roomPlayers.find((p) => p.name === playerName);
  const isHost = myPlayer ? myPlayer.id === hostId : false;

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

  // Room lobby — shown when we have a roomId (from create, join, or reconnect)
  if (roomId) {
    return (
      <div className="lobby">
        <h1 className="lobby-title">Bohnanza</h1>
        <div className="room-lobby">
          <h2 className="room-name">Room: {roomId.slice(0, 6)}</h2>

          {isHost && (
            <div className="room-settings">
              <label className="form-label">
                Room Size:
                <select
                  className="form-select"
                  value={maxPlayers}
                  onChange={(e) => handleChangeMaxPlayers(Number(e.target.value))}
                >
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n} disabled={n < roomPlayers.length}>
                      {n} Players
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div className="player-slots">
            {Array.from({ length: maxPlayers }).map((_, i) => (
              <div
                key={i}
                className={`player-slot ${roomPlayers[i] ? 'filled' : 'empty'}`}
              >
                {roomPlayers[i] ? (
                  <>
                    <span className="player-name">
                      <span className="player-icon">{roomPlayers[i].isBot ? '🤖' : '🧑‍🌾'}</span>
                      {roomPlayers[i].name}
                    </span>
                    {roomPlayers[i].id === hostId && (
                      <span className="host-badge">Host</span>
                    )}
                    {isHost && roomPlayers[i].isBot && (
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => handleRemoveBot(roomPlayers[i].id)}
                        style={{ marginLeft: 8, padding: '2px 8px', fontSize: '0.8rem' }}
                      >
                        Remove
                      </button>
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
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={roomPlayers.length < 2}
                className="btn-primary btn-large"
              >
                Start Game ({roomPlayers.length}/{maxPlayers})
              </button>
            )}
            {isHost && roomPlayers.length < maxPlayers && (
              <button onClick={handleAddBot} className="btn-secondary">
                🤖 Add Bot
              </button>
            )}
            <button onClick={handleLeaveRoom} className="btn-secondary">
              Leave Room
            </button>
            {isHost && (
              <button onClick={handleDeleteRoom} className="btn-danger">
                Delete Room
              </button>
            )}
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
