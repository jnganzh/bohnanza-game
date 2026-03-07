import { useEffect, useRef, useState, useCallback } from 'react';
import './VoiceChatPanel.css';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface VoiceChatPanelProps {
  roomId: string;
  playerName: string;
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadJitsiScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    if (scriptLoading) {
      loadCallbacks.push(resolve);
      return;
    }
    scriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://meet.ffmuc.net/external_api.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export function VoiceChatPanel({ roomId, playerName }: VoiceChatPanelProps) {
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const apiRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const joinVoice = useCallback(async () => {
    setLoading(true);
    await loadJitsiScript();
    if (!containerRef.current) return;

    const api = new window.JitsiMeetExternalAPI('meet.ffmuc.net', {
      roomName: `bohnanza-${roomId}`,
      parentNode: containerRef.current,
      userInfo: { displayName: playerName },
      configOverwrite: {
        startWithAudioMuted: true,
        startWithVideoMuted: true,
        disableVideo: true,
        prejoinPageEnabled: false,
        toolbarButtons: ['microphone', 'hangup'],
        disableInviteFunctions: true,
        enableClosePage: false,
        disableDeepLinking: true,
        notifications: [],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_BUTTONS: ['microphone', 'hangup'],
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
        FILM_STRIP_MAX_HEIGHT: 0,
        DISABLE_VIDEO_BACKGROUND: true,
        HIDE_INVITE_MORE_HEADER: true,
      },
    });

    api.addEventListener('readyToClose', () => {
      api.dispose();
      apiRef.current = null;
      setJoined(false);
    });

    apiRef.current = api;
    setJoined(true);
    setLoading(false);
  }, [roomId, playerName]);

  const leaveVoice = useCallback(() => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }
    setJoined(false);
  }, []);

  useEffect(() => {
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, []);

  return (
    <div className="voice-chat-panel">
      <div className="voice-chat-header">
        <span className="voice-icon">🎙️</span>
        Voice Chat
      </div>

      <div className="voice-chat-actions">
        {!joined ? (
          <button
            className="voice-btn voice-btn-join"
            onClick={joinVoice}
            disabled={loading}
          >
            {loading ? 'Connecting…' : 'Join Voice'}
          </button>
        ) : (
          <button className="voice-btn voice-btn-leave" onClick={leaveVoice}>
            Leave Voice
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="jitsi-container"
        style={{ display: joined ? 'block' : 'none' }}
      />
    </div>
  );
}
