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

  if (!playerName) {
    return (
      <div className="lobby">
        <h1>Bohnanza</h1>
        <div className="name-form">
          <input
            type="text"
            placeholder="Enter your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetName()}
            maxLength={20}
          />
          <button onClick={handleSetName} disabled={!nameInput.trim()}>
            Play
          </button>
        </div>
      </div>
    );
  }

  if (joined && roomId) {
    const isHost = roomPlayers.length > 0 && hostId === roomPlayers.find(p => {
      // Find our player by checking if we're the host
      return true; // simplified - we check against the socket
    })?.id;

    return (
      <div className="lobby">
        <h1>Bohnanza</h1>
        <div className="room-lobby">
          <h2>Room: {roomId}</h2>
          <div className="player-slots">
            {Array.from({ length: maxPlayers }).map((_, i) => (
              <div
                key={i}
                className={`player-slot ${roomPlayers[i] ? 'filled' : 'empty'}`}
              >
                {roomPlayers[i] ? (
                  <>
                    <span className="player-name">{roomPlayers[i].name}</span>
                    {roomPlayers[i].id === hostId && (
                      <span className="host-badge">Host</span>
                    )}
                  </>
                ) : (
                  <span className="waiting">Waiting...</span>
                )}
              </div>
            ))}
          </div>
          <div className="room-actions">
            <button
              onClick={handleStartGame}
              disabled={roomPlayers.length < 2}
              className="start-btn"
            >
              Start Game ({roomPlayers.length}/{maxPlayers})
            </button>
            <button onClick={handleLeaveRoom} className="leave-btn">
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

  return (
    <div className="lobby">
      <h1>Bohnanza</h1>
      <p className="welcome">Welcome, {playerName}!</p>

      <div className="create-room">
        <h3>Create Room</h3>
        <div className="create-form">
          <label>
            Max players:
            <select
              value={maxPlayersInput}
              onChange={(e) => setMaxPlayersInput(Number(e.target.value))}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </label>
          <button onClick={handleCreateRoom}>Create</button>
        </div>
      </div>

      <div className="room-list">
        <h3>Available Rooms</h3>
        {rooms.length === 0 ? (
          <p className="no-rooms">No rooms available. Create one!</p>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="room-item">
              <span>
                {room.hostName}'s room ({room.playerCount}/{room.maxPlayers})
              </span>
              <button
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
