import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, GamePhase, RoomSnapshot, ServerMessage } from '../shared/types';
import { soundEngine } from '../utils/sound';

export interface SceneFeedbackMarker {
  id: string;
  status: 'FOUND' | 'ALREADY_FOUND' | 'MISS' | 'COOLDOWN';
  sceneId?: string;
  x: number;
  y: number;
  label: string;
}

export function useDetectiveSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const lastCursorSentRef = useRef<number>(0);
  const lastPhaseRef = useRef<GamePhase | null>(null);

  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, { sceneId: string; x: number; y: number }>
  >({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [feedbackMarkers, setFeedbackMarkers] = useState<SceneFeedbackMarker[]>([]);
  const [muted, setMuted] = useState(false);

  const pushNotice = useCallback((text: string) => {
    setNoticeMsg(text);
    setTimeout(() => {
      setNoticeMsg((curr) => (curr === text ? null : curr));
    }, 4500);
  }, []);

  const pushMarker = useCallback((marker: SceneFeedbackMarker) => {
    setFeedbackMarkers((prev) => [...prev.slice(-6), marker]);
    setTimeout(() => {
      setFeedbackMarkers((prev) => prev.filter((item) => item.id !== marker.id));
    }, 1500);
  }, []);

  const connectSocket = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return wsRef.current;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
    };

    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        return;
      }

      if (msg.type === 'room:joined') {
        setPlayerId(msg.playerId);
        setSnapshot(msg.snapshot);
        lastPhaseRef.current = msg.snapshot.phase;
        setErrorMsg(null);
        setRemoteCursors({});
        return;
      }

      if (msg.type === 'room:state') {
        const prevPhase = lastPhaseRef.current;
        const nextPhase = msg.snapshot.phase;
        if (prevPhase && prevPhase !== nextPhase) {
          if (nextPhase === 'RESULT' && msg.snapshot.verdictSummary) {
            soundEngine.playStampThud();
            soundEngine.playVerdictFanfare(msg.snapshot.verdictSummary.isTeamCorrect);
          } else {
            soundEngine.playPhaseBell();
          }
        }
        lastPhaseRef.current = nextPhase;
        setSnapshot(msg.snapshot);
        return;
      }

      if (msg.type === 'room:error') {
        setErrorMsg(msg.message);
        return;
      }

      if (msg.type === 'room:closed') {
        setSnapshot(null);
        setPlayerId(null);
        setRemoteCursors({});
        lastPhaseRef.current = null;
        setErrorMsg(msg.message);
        return;
      }

      if (msg.type === 'cursor:update') {
        setRemoteCursors((prev) => ({
          ...prev,
          [msg.playerId]: { sceneId: msg.sceneId, x: msg.x, y: msg.y },
        }));
        return;
      }

      if (msg.type === 'clue:result') {
        const markerId = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        if (msg.status === 'FOUND') {
          const combo = msg.comboMultiplier ?? 1;
          const pts = msg.pointsEarned ?? 150;
          const comboSuffix = combo > 1 ? ` · x${combo}` : '';
          soundEngine.playClueFound(combo);
          pushMarker({
            id: markerId,
            status: 'FOUND',
            sceneId: msg.sceneId,
            x: msg.x,
            y: msg.y,
            label: `+${pts}${comboSuffix} · ${msg.clueName || 'Bukti'} (${msg.playerName})`,
          });
        } else if (msg.status === 'MISS') {
          soundEngine.playPenaltyMiss();
          pushMarker({
            id: markerId,
            status: 'MISS',
            sceneId: msg.sceneId,
            x: msg.x,
            y: msg.y,
            label: `-${msg.penaltySeconds || 10}d (${msg.playerName})`,
          });
        } else if (msg.status === 'COOLDOWN') {
          pushMarker({
            id: markerId,
            status: 'COOLDOWN',
            sceneId: msg.sceneId,
            x: msg.x,
            y: msg.y,
            label: 'Cooldown penalti...',
          });
        } else if (msg.status === 'ALREADY_FOUND') {
          pushMarker({
            id: markerId,
            status: 'ALREADY_FOUND',
            sceneId: msg.sceneId,
            x: msg.x,
            y: msg.y,
            label: 'Sudah ditemukan',
          });
        }
        return;
      }

      if (msg.type === 'notice:info') {
        pushNotice(msg.message);
      }
    };

    return ws;
  }, [pushMarker, pushNotice]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectSocket]);

  const sendMessage = useCallback(
    (payload: ClientMessage) => {
      const ws = connectSocket();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      } else {
        const handleOpen = () => {
          ws.send(JSON.stringify(payload));
          ws.removeEventListener('open', handleOpen);
        };
        ws.addEventListener('open', handleOpen);
      }
    },
    [connectSocket]
  );

  const createRoom = useCallback(
    (playerName: string) => {
      setErrorMsg(null);
      sendMessage({ type: 'room:create', playerName });
    },
    [sendMessage]
  );

  const joinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      setErrorMsg(null);
      sendMessage({ type: 'room:join', roomCode, playerName });
    },
    [sendMessage]
  );

  const leaveRoom = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setSnapshot(null);
    setPlayerId(null);
    setRemoteCursors({});
    lastPhaseRef.current = null;
    setTimeout(() => {
      connectSocket();
    }, 80);
  }, [connectSocket]);

  const startGame = useCallback(() => {
    sendMessage({ type: 'room:start_game' });
  }, [sendMessage]);

  const restartLobby = useCallback(() => {
    sendMessage({ type: 'room:restart_lobby' });
  }, [sendMessage]);

  const selectCrimeScene = useCallback(
    (sceneId: string) => {
      sendMessage({ type: 'scene:select', sceneId });
    },
    [sendMessage]
  );

  const sendCursorMove = useCallback(
    (x: number, y: number) => {
      const now = performance.now();
      if (now - lastCursorSentRef.current < 35) return;
      lastCursorSentRef.current = now;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'cursor:move', x, y } satisfies ClientMessage));
      }
    },
    []
  );

  const sendClueClick = useCallback(
    (sceneId: string, clueId: string | null, x: number, y: number) => {
      sendMessage({ type: 'clue:click', sceneId, clueId, x, y });
    },
    [sendMessage]
  );

  const advancePhase = useCallback(
    (targetPhase: 'INVESTIGATION_BOARD' | 'VERDICT') => {
      sendMessage({ type: 'phase:advance', targetPhase });
    },
    [sendMessage]
  );

  const selectSuspect = useCallback(
    (suspectId: string) => {
      soundEngine.playDialogueBlip();
      sendMessage({ type: 'dialogue:select_suspect', suspectId });
    },
    [sendMessage]
  );

  const chooseDialogue = useCallback(
    (choiceId: string) => {
      soundEngine.playDialogueBlip();
      sendMessage({ type: 'dialogue:choose', choiceId });
    },
    [sendMessage]
  );

  const castVote = useCallback(
    (culpritId: string, pokemonId: string) => {
      sendMessage({ type: 'vote:cast', culpritId, pokemonId });
    },
    [sendMessage]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  return {
    connected,
    playerId,
    snapshot,
    remoteCursors,
    errorMsg,
    noticeMsg,
    feedbackMarkers,
    muted,
    setErrorMsg,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    restartLobby,
    selectCrimeScene,
    sendCursorMove,
    sendClueClick,
    advancePhase,
    selectSuspect,
    chooseDialogue,
    castVote,
    toggleMute,
  };
}
