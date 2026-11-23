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

export type TransportStatus = 'connecting' | 'ws' | 'http' | 'error';

interface UseDetectiveSocketOptions {
  enabled?: boolean;
}

export function useDetectiveSocket(options: UseDetectiveSocketOptions = {}) {
  const { enabled = true } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const httpSidRef = useRef<string | null>(null);
  const httpAbortRef = useRef<AbortController | null>(null);
  const wsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueueRef = useRef<ClientMessage[]>([]);
  const mountedRef = useRef(true);
  const lastCursorSentRef = useRef<number>(0);
  const lastPhaseRef = useRef<GamePhase | null>(null);
  const transportModeRef = useRef<'ws' | 'http' | null>(null);

  const [connected, setConnected] = useState(false);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>('connecting');
  const [connectionHint, setConnectionHint] = useState<string | null>(null);
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

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
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
    },
    [pushMarker, pushNotice]
  );

  const cleanupTransports = useCallback(() => {
    if (wsTimeoutRef.current) {
      clearTimeout(wsTimeoutRef.current);
      wsTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (httpAbortRef.current) {
      httpAbortRef.current.abort();
      httpAbortRef.current = null;
    }
    if (httpSidRef.current) {
      const sid = httpSidRef.current;
      httpSidRef.current = null;
      void fetch('/api/rt/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid }),
        keepalive: true,
      }).catch(() => {});
    }
    transportModeRef.current = null;
  }, []);

  const flushPendingQueue = useCallback(async () => {
    const items = pendingQueueRef.current.splice(0, pendingQueueRef.current.length);
    for (const payload of items) {
      if (transportModeRef.current === 'ws' && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      } else if (transportModeRef.current === 'http' && httpSidRef.current) {
        await fetch('/api/rt/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid: httpSidRef.current, payload }),
        }).catch(() => {});
      }
    }
  }, []);

  const startHttpFallback = useCallback(async () => {
    if (!mountedRef.current || !enabled) return;
    if (transportModeRef.current === 'http' && httpSidRef.current) return;

    if (wsTimeoutRef.current) {
      clearTimeout(wsTimeoutRef.current);
      wsTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const res = await fetch('/api/rt/session', { method: 'POST' });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { sid?: string };
      if (!data.sid) {
        throw new Error('Missing session ID');
      }
      if (!mountedRef.current) return;

      httpSidRef.current = data.sid;
      transportModeRef.current = 'http';
      setConnected(true);
      setTransportStatus('http');
      setConnectionHint(null);
      void flushPendingQueue();

      const controller = new AbortController();
      httpAbortRef.current = controller;

      const pollLoop = async (sid: string) => {
        while (mountedRef.current && httpSidRef.current === sid && !controller.signal.aborted) {
          try {
            const pollRes = await fetch(`/api/rt/poll?sid=${encodeURIComponent(sid)}`, {
              signal: controller.signal,
            });
            if (pollRes.status === 404) {
              httpSidRef.current = null;
              transportModeRef.current = null;
              setConnected(false);
              setTransportStatus('error');
              setConnectionHint('Sesi koneksi ke server berakhir. Klik hubungkan ulang.');
              return;
            }
            if (!pollRes.ok) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
            const body = (await pollRes.json()) as { messages?: ServerMessage[] };
            if (Array.isArray(body.messages)) {
              for (const msg of body.messages) {
                handleServerMessage(msg);
              }
            }
          } catch (err) {
            if ((err as Error)?.name === 'AbortError') return;
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      };

      void pollLoop(data.sid);
    } catch {
      if (!mountedRef.current) return;
      setConnected(false);
      setTransportStatus('error');
      setConnectionHint(
        'Server game belum terjangkau dari Owlbear Rodeo. Pastikan memakai URL publik/Share atau deployment aktif (bukan URL preview privat).'
      );
    }
  }, [enabled, flushPendingQueue, handleServerMessage]);

  const connectSocket = useCallback(() => {
    if (!enabled) return;
    if (
      (transportModeRef.current === 'ws' &&
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)) ||
      (transportModeRef.current === 'http' && httpSidRef.current)
    ) {
      return;
    }

    cleanupTransports();
    setConnected(false);
    setTransportStatus('connecting');
    setConnectionHint(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    } catch {
      void startHttpFallback();
      return;
    }

    wsRef.current = ws;
    let opened = false;

    wsTimeoutRef.current = setTimeout(() => {
      if (!opened && mountedRef.current && transportModeRef.current !== 'http') {
        void startHttpFallback();
      }
    }, 2500);

    ws.onopen = () => {
      opened = true;
      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current);
        wsTimeoutRef.current = null;
      }
      transportModeRef.current = 'ws';
      setConnected(true);
      setTransportStatus('ws');
      setConnectionHint(null);
      void flushPendingQueue();
    };

    ws.onerror = () => {
      if (!opened && mountedRef.current && transportModeRef.current !== 'http') {
        void startHttpFallback();
      }
    };

    ws.onclose = () => {
      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current);
        wsTimeoutRef.current = null;
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (!opened && mountedRef.current && transportModeRef.current !== 'http') {
        void startHttpFallback();
        return;
      }
      if (transportModeRef.current === 'ws') {
        transportModeRef.current = null;
        setConnected(false);
        setTransportStatus('connecting');
        setTimeout(() => {
          if (mountedRef.current && enabled && !transportModeRef.current) {
            connectSocket();
          }
        }, 1000);
      }
    };

    ws.onmessage = (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        return;
      }
      handleServerMessage(msg);
    };
  }, [cleanupTransports, enabled, flushPendingQueue, handleServerMessage, startHttpFallback]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      connectSocket();
    }
    return () => {
      mountedRef.current = false;
      cleanupTransports();
    };
  }, [enabled, connectSocket, cleanupTransports]);

  const sendMessage = useCallback(
    (payload: ClientMessage) => {
      if (transportModeRef.current === 'ws' && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
        return;
      }
      if (transportModeRef.current === 'http' && httpSidRef.current) {
        void fetch('/api/rt/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sid: httpSidRef.current, payload }),
        });
        return;
      }
      pendingQueueRef.current.push(payload);
      connectSocket();
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
    cleanupTransports();
    setSnapshot(null);
    setPlayerId(null);
    setRemoteCursors({});
    lastPhaseRef.current = null;
    setTimeout(() => {
      if (mountedRef.current && enabled) {
        connectSocket();
      }
    }, 80);
  }, [cleanupTransports, connectSocket, enabled]);

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

  const sendCursorMove = useCallback((x: number, y: number) => {
    const now = performance.now();
    const minInterval = transportModeRef.current === 'http' ? 120 : 35;
    if (now - lastCursorSentRef.current < minInterval) return;
    lastCursorSentRef.current = now;
    if (transportModeRef.current === 'ws' && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cursor:move', x, y } satisfies ClientMessage));
    } else if (transportModeRef.current === 'http' && httpSidRef.current) {
      void fetch('/api/rt/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sid: httpSidRef.current,
          payload: { type: 'cursor:move', x, y } satisfies ClientMessage,
        }),
      }).catch(() => {});
    }
  }, []);

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
    transportStatus,
    connectionHint,
    retryConnection: connectSocket,
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
