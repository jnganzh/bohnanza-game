import { useCallback, useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { socket } from '../socket/socketClient.js';

interface VoicePeer {
  playerId: string;
  playerName: string;
  peer: SimplePeer.Instance;
  speaking: boolean;
}

export interface VoicePeerInfo {
  playerId: string;
  playerName: string;
  speaking: boolean;
}

export function useVoiceChat() {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peers, setPeers] = useState<VoicePeerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, VoicePeer>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);
  const joinedRef = useRef(false);
  const pendingSignalsRef = useRef<Map<string, SimplePeer.SignalData[]>>(new Map());

  const syncPeersState = useCallback(() => {
    setPeers(
      Array.from(peersRef.current.values()).map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        speaking: p.speaking,
      }))
    );
  }, []);

  // Use refs for functions to avoid dependency churn in useEffect
  const syncPeersRef = useRef(syncPeersState);
  syncPeersRef.current = syncPeersState;

  const createPeerRef = useRef<(playerId: string, playerName: string, initiator: boolean) => void>();

  createPeerRef.current = (playerId: string, playerName: string, initiator: boolean) => {
    if (!streamRef.current) {
      console.log('[voice] createPeer: no stream, skipping', playerId);
      return;
    }
    if (peersRef.current.has(playerId)) {
      console.log('[voice] createPeer: already have peer', playerId);
      return;
    }

    console.log('[voice] createPeer:', playerId, playerName, initiator ? 'initiator' : 'receiver');

    const peer = new SimplePeer({
      initiator,
      stream: streamRef.current,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    const voicePeer: VoicePeer = { playerId, playerName, peer, speaking: false };
    peersRef.current.set(playerId, voicePeer);

    peer.on('signal', (signal) => {
      console.log('[voice] sending signal to', playerId);
      socket.emit('voice:signal', { targetPlayerId: playerId, signal });
    });

    let cleanupDetect: (() => void) | null = null;

    peer.on('stream', (remoteStream) => {
      console.log('[voice] got stream from', playerId);
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.play().catch(() => {});

      // Voice activity detection
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(remoteStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let wasSpeaking = false;

        const interval = setInterval(() => {
          if (!peersRef.current.has(playerId)) {
            clearInterval(interval);
            ctx.close();
            return;
          }
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const isSpeaking = avg > 15;
          if (isSpeaking !== wasSpeaking) {
            wasSpeaking = isSpeaking;
            const p = peersRef.current.get(playerId);
            if (p) {
              p.speaking = isSpeaking;
              syncPeersRef.current();
            }
          }
        }, 100);

        cleanupDetect = () => {
          clearInterval(interval);
          ctx.close();
        };
      } catch {
        // AudioContext not available
      }
    });

    peer.on('connect', () => {
      console.log('[voice] peer connected:', playerId);
    });

    peer.on('close', () => {
      console.log('[voice] peer closed:', playerId);
      cleanupDetect?.();
      peersRef.current.delete(playerId);
      syncPeersRef.current();
    });

    peer.on('error', (err) => {
      console.log('[voice] peer error:', playerId, err.message);
      cleanupDetect?.();
      peersRef.current.delete(playerId);
      syncPeersRef.current();
    });

    // Flush any signals that arrived before peer was created
    const pending = pendingSignalsRef.current.get(playerId);
    if (pending) {
      console.log('[voice] flushing', pending.length, 'pending signals for', playerId);
      for (const sig of pending) {
        peer.signal(sig);
      }
      pendingSignalsRef.current.delete(playerId);
    }

    syncPeersRef.current();
  };

  // Socket event handlers — registered once, use refs to avoid stale closures
  useEffect(() => {
    const onPeers = (data: { peers: { playerId: string; playerName: string }[] }) => {
      console.log('[voice] received voice:peers', data.peers.length, 'peers');
      if (!joinedRef.current) return;
      for (const p of data.peers) {
        createPeerRef.current?.(p.playerId, p.playerName, true);
      }
    };

    const onPeerJoined = (data: { playerId: string; playerName: string }) => {
      console.log('[voice] received voice:peer-joined', data.playerId, data.playerName);
      if (!joinedRef.current) return;
      createPeerRef.current?.(data.playerId, data.playerName, false);
    };

    const onPeerLeft = (data: { playerId: string }) => {
      console.log('[voice] received voice:peer-left', data.playerId);
      const vp = peersRef.current.get(data.playerId);
      if (vp) {
        vp.peer.destroy();
        peersRef.current.delete(data.playerId);
        syncPeersRef.current();
      }
    };

    const onSignal = (data: { fromPlayerId: string; signal: unknown }) => {
      if (!joinedRef.current) return;
      const vp = peersRef.current.get(data.fromPlayerId);
      if (vp) {
        vp.peer.signal(data.signal as SimplePeer.SignalData);
      } else {
        console.log('[voice] buffering signal from unknown peer', data.fromPlayerId);
        if (!pendingSignalsRef.current.has(data.fromPlayerId)) {
          pendingSignalsRef.current.set(data.fromPlayerId, []);
        }
        pendingSignalsRef.current.get(data.fromPlayerId)!.push(data.signal as SimplePeer.SignalData);
      }
    };

    socket.on('voice:peers', onPeers);
    socket.on('voice:peer-joined', onPeerJoined);
    socket.on('voice:peer-left', onPeerLeft);
    socket.on('voice:signal', onSignal);

    return () => {
      socket.off('voice:peers', onPeers);
      socket.off('voice:peer-joined', onPeerJoined);
      socket.off('voice:peer-left', onPeerLeft);
      socket.off('voice:signal', onSignal);
    };
  }, []); // Empty deps — stable listeners using refs

  const joinVoice = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      joinedRef.current = true;
      setJoined(true);
      console.log('[voice] joining voice, emitting voice:join');
      socket.emit('voice:join');
    } catch (err) {
      setError('Could not access microphone. Please allow mic permissions.');
    }
  }, []);

  const leaveVoice = useCallback(() => {
    joinedRef.current = false;
    setJoined(false);

    for (const [, vp] of peersRef.current) {
      vp.peer.destroy();
    }
    peersRef.current.clear();
    pendingSignalsRef.current.clear();
    syncPeersRef.current();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    socket.emit('voice:leave');
  }, []);

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const newMuted = !muted;
    streamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !newMuted;
    });
    setMuted(newMuted);
  }, [muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        for (const [, vp] of peersRef.current) {
          vp.peer.destroy();
        }
        peersRef.current.clear();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        socket.emit('voice:leave');
        joinedRef.current = false;
      }
    };
  }, []);

  return { joined, muted, peers, error, joinVoice, leaveVoice, toggleMute };
}
