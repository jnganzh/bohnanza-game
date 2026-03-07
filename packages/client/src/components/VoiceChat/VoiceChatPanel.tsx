import { useVoiceChat } from '../../hooks/useVoiceChat.js';
import './VoiceChatPanel.css';

export function VoiceChatPanel() {
  const { joined, muted, peers, error, joinVoice, leaveVoice, toggleMute } =
    useVoiceChat();

  return (
    <div className="voice-chat-panel">
      <div className="voice-chat-header">
        <span className="voice-icon">🎙️</span>
        Voice Chat
      </div>

      <div className="voice-chat-actions">
        {!joined ? (
          <button className="voice-btn voice-btn-join" onClick={joinVoice}>
            Join Voice
          </button>
        ) : (
          <>
            <button className="voice-btn voice-btn-leave" onClick={leaveVoice}>
              Leave
            </button>
            <button
              className={`voice-btn voice-btn-mute ${muted ? 'muted' : ''}`}
              onClick={toggleMute}
            >
              {muted ? '🔇 Unmute' : '🎤 Mute'}
            </button>
          </>
        )}
      </div>

      {error && <div className="voice-error">{error}</div>}

      {joined && (
        <div className="voice-peers">
          {peers.length === 0 && (
            <div className="voice-empty">No other players in voice yet</div>
          )}
          {peers.map((p) => (
            <div
              key={p.playerId}
              className={`voice-peer ${p.speaking ? 'speaking' : ''}`}
            >
              <span className="voice-dot" />
              {p.playerName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
