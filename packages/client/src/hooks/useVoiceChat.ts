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

  // Sync peers map to state
  const syncPeersState = useCallback(() => {
    setPeers(
      Array.from(peersRef.current.values()).map((p) => ({
        playerId: p.playerId,
        playerName: p.playerName,
        speaking: p.speaking,
      }))
    );
  }, []);

  // Set up voice activity detection on an audio stream
  const detectSpeaking = useCallback(
    (playerId: string, stream: MediaStream) => {
      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
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
            const peer = peersRef.current.get(playerId);
            if (peer) {
              peer.speaking = isSpeaking;
              syncPeersState();
            }
          }
        }, 100);

        return () => {
          clearInterval(interval);
          ctx.close();
        };
      } catch {
        // AudioContext not available
        return () => {};
      }
    },
    [syncPeersState]
  );

  // Create a peer connection to a remote player
  const createPeer = useCallback(
    (playerId: string, playerName: string, initiator: boolean) => {
      if (!streamRef.current) return;
      if (peersRef.current.has(playerId)) return;

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
        socket.emit('voice:signal', { targetPlayerId: playerId, signal });
      });

      let cleanupDetect: (() => void) | null = null;

      peer.on('stream', (remoteStream) => {
        // Play audio
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.play().catch(() => {});

        // Detect speaking
        cleanupDetect = detectSpeaking(playerId, remoteStream);
      });

      peer.on('close', () => {
        cleanupDetect?.();
        peersRef.current.delete(playerId);
        syncPeersState();
      });

      peer.on('error', () => {
        cleanupDetect?.();
        peersRef.current.delete(playerId);
        syncPeersState();
      });

      syncPeersState();
    },
    [detectSpeaking, syncPeersState]
  );

  // Socket event handlers
  useEffect(() => {
    const onPeers = (data: { peers: { playerId: string; playerName: string }[] }) => {
      if (!joinedRef.current) return;
      // Connect to all existing peers (we are the initiator)
      for (const p of data.peers) {
        createPeer(p.playerId, p.playerName, true);
      }
    };

    const onPeerJoined = (data: { playerId: string; playerName: string }) => {
      if (!joinedRef.current) return;
      // New peer joined — they will initiate, we wait
      // Actually: the existing peers initiate to the new joiner based on voice:peers
      // But if we receive peer-joined, the new peer is initiating to us via voice:peers
      // So we create a non-initiator peer
      createPeer(data.playerId, data.playerName, false);
    };

    const onPeerLeft = (data: { playerId: string }) => {
      const vp = peersRef.current.get(data.playerId);
      if (vp) {
        vp.peer.destroy();
        peersRef.current.delete(data.playerId);
        syncPeersState();
      }
    };

    const onSignal = (data: { fromPlayerId: string; signal: unknown }) => {
      if (!joinedRef.current) return;
      const vp = peersRef.current.get(data.fromPlayerId);
      if (vp) {
        vp.peer.signal(data.signal as SimplePeer.SignalData);
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
  }, [createPeer, syncPeersState]);

  const joinVoice = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      joinedRef.current = true;
      setJoined(true);
      socket.emit('voice:join');
    } catch (err) {
      setError('Could not access microphone. Please allow mic permissions.');
    }
  }, []);

  const leaveVoice = useCallback(() => {
    joinedRef.current = false;
    setJoined(false);

    // Destroy all peers
    for (const [, vp] of peersRef.current) {
      vp.peer.destroy();
    }
    peersRef.current.clear();
    syncPeersState();

    // Stop mic
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    socket.emit('voice:leave');
  }, [syncPeersState]);

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
