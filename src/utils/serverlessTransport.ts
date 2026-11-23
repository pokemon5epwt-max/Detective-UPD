import OBR from '@owlbear-rodeo/sdk';
import {
  AuthoritativeRoomEngine,
  compactSnapshot,
  hydrateCompactSnapshot,
  type CompactRoomState,
} from '../shared/gameRoomEngine';
import type { ClientMessage, ServerMessage } from '../shared/types';

const CHANNEL_CLIENT = 'hoenn.detective.agency/client';
const CHANNEL_SERVER = 'hoenn.detective.agency/server';

type CompactServerWireMessage =
  | { type: 'room:joined'; playerId: string; compact: CompactRoomState }
  | { type: 'room:state'; compact: CompactRoomState }
  | Exclude<ServerMessage, { type: 'room:joined' } | { type: 'room:state' }>;

interface ClientEnvelope {
  kind: 'msg' | 'leave';
  roomCode?: string;
  senderId: string;
  payload?: ClientMessage;
}

interface ServerEnvelope {
  targetSenderId: string | '*';
  roomCode: string;
  wire: CompactServerWireMessage;
}

function serializeWire(msg: ServerMessage): CompactServerWireMessage {
  if (msg.type === 'room:joined') {
    return {
      type: 'room:joined',
      playerId: msg.playerId,
      compact: compactSnapshot(msg.snapshot),
    };
  }
  if (msg.type === 'room:state') {
    return {
      type: 'room:state',
      compact: compactSnapshot(msg.snapshot),
    };
  }
  return msg;
}

function hydrateWire(wire: CompactServerWireMessage): ServerMessage {
  if (wire.type === 'room:joined') {
    return {
      type: 'room:joined',
      playerId: wire.playerId,
      snapshot: hydrateCompactSnapshot(wire.compact),
    };
  }
  if (wire.type === 'room:state') {
    return {
      type: 'room:state',
      snapshot: hydrateCompactSnapshot(wire.compact),
    };
  }
  return wire;
}

export interface ServerlessSession {
  send: (msg: ClientMessage) => void;
  close: () => void;
}

export function createLocalSoloSession(onMessage: (msg: ServerMessage) => void): ServerlessSession {
  let engine: AuthoritativeRoomEngine | null = null;
  const selfPeerKey = 'local_solo';

  return {
    send(msg: ClientMessage) {
      if (msg.type === 'room:create') {
        engine?.destroy();
        engine = new AuthoritativeRoomEngine(selfPeerKey, msg.playerName, {
          sendToPeer: (_peerKey, serverMsg) => onMessage(serverMsg),
          broadcastAll: (serverMsg) => onMessage(serverMsg),
        });
        const hostId = engine.hostId;
        onMessage({
          type: 'room:joined',
          playerId: hostId,
          snapshot: engine.getSnapshot(),
        });
        return;
      }

      if (msg.type === 'room:join') {
        if (engine && engine.roomCode === msg.roomCode.trim().toUpperCase()) {
          engine.joinPeer(selfPeerKey, msg.playerName, msg.roomCode);
        } else {
          onMessage({
            type: 'room:error',
            message:
              'Mode Solo Lokal hanya mendukung membuat room sendiri. Untuk bergabung antar pemain di Vercel, mainkan lewat ekstensi Owlbear Rodeo atau hubungkan server WebSocket (VITE_SERVER_URL).',
          });
        }
        return;
      }

      engine?.handlePeerMessage(selfPeerKey, msg);
    },
    close() {
      engine?.destroy();
      engine = null;
    },
  };
}

export function createObrBroadcastSession(
  onMessage: (msg: ServerMessage) => void,
  onReadyChange?: (ready: boolean) => void
): ServerlessSession {
  const selfSenderId = `obr_${Math.random().toString(36).slice(2, 10)}`;
  let hostEngine: AuthoritativeRoomEngine | null = null;
  let joinedRoomCode: string | null = null;
  let unsubClient: (() => void) | null = null;
  let unsubServer: (() => void) | null = null;
  let destroyed = false;

  const dispatchLocalOrRemote = (targetSenderId: string | '*', msg: ServerMessage) => {
    if (!hostEngine) return;
    if (targetSenderId === selfSenderId || targetSenderId === '*') {
      onMessage(msg);
    }
    if (targetSenderId === selfSenderId) return;

    const envelope: ServerEnvelope = {
      targetSenderId,
      roomCode: hostEngine.roomCode,
      wire: serializeWire(msg),
    };
    void OBR.broadcast.sendMessage(CHANNEL_SERVER, envelope, { destination: 'REMOTE' });
  };

  let joinTimeout: ReturnType<typeof setTimeout> | null = null;
  let joinedSuccess = false;

  const clearJoinTimeout = () => {
    if (joinTimeout) {
      clearTimeout(joinTimeout);
      joinTimeout = null;
    }
  };

  const setupListeners = () => {
    if (destroyed) return;

    unsubClient = OBR.broadcast.onMessage(CHANNEL_CLIENT, (event) => {
      if (!hostEngine) return;
      const env = event.data as ClientEnvelope | undefined;
      if (!env || !env.senderId) return;

      if (env.kind === 'leave') {
        if (env.roomCode === hostEngine.roomCode) {
          hostEngine.removePeer(env.senderId);
        }
        return;
      }

      if (!env.payload) return;
      if (env.payload.type === 'room:join') {
        if (env.payload.roomCode.trim().toUpperCase() === hostEngine.roomCode) {
          hostEngine.joinPeer(env.senderId, env.payload.playerName, env.payload.roomCode);
        }
        return;
      }

      if (env.roomCode === hostEngine.roomCode) {
        hostEngine.handlePeerMessage(env.senderId, env.payload);
      }
    });

    unsubServer = OBR.broadcast.onMessage(CHANNEL_SERVER, (event) => {
      if (hostEngine) return; // Host already receives its own authoritative events
      const env = event.data as ServerEnvelope | undefined;
      if (!env || !env.wire) return;
      if (env.targetSenderId !== '*' && env.targetSenderId !== selfSenderId) return;
      if (joinedRoomCode && env.roomCode !== joinedRoomCode) return;

      const hydrated = hydrateWire(env.wire);
      if (hydrated.type === 'room:joined') {
        joinedSuccess = true;
        clearJoinTimeout();
        joinedRoomCode = hydrated.snapshot.roomCode;
      } else if (hydrated.type === 'room:error') {
        clearJoinTimeout();
      } else if (hydrated.type === 'room:closed') {
        joinedSuccess = false;
        clearJoinTimeout();
        joinedRoomCode = null;
      }
      onMessage(hydrated);
    });

    onReadyChange?.(true);
  };

  if (OBR.isAvailable) {
    if (OBR.isReady) {
      setupListeners();
    } else {
      OBR.onReady(() => setupListeners());
    }
  }

  return {
    send(msg: ClientMessage) {
      if (msg.type === 'room:create') {
        clearJoinTimeout();
        joinedSuccess = false;
        hostEngine?.destroy();
        joinedRoomCode = null;
        hostEngine = new AuthoritativeRoomEngine(selfSenderId, msg.playerName, {
          sendToPeer: (peerKey, serverMsg) => dispatchLocalOrRemote(peerKey, serverMsg),
          broadcastAll: (serverMsg, excludePeerKey) => {
            if (!hostEngine) return;
            if (excludePeerKey !== selfSenderId) {
              onMessage(serverMsg);
            }
            const envelope: ServerEnvelope = {
              targetSenderId: '*',
              roomCode: hostEngine.roomCode,
              wire: serializeWire(serverMsg),
            };
            void OBR.broadcast.sendMessage(CHANNEL_SERVER, envelope, { destination: 'REMOTE' });
          },
        });
        joinedRoomCode = hostEngine.roomCode;
        joinedSuccess = true;
        onMessage({
          type: 'room:joined',
          playerId: hostEngine.hostId,
          snapshot: hostEngine.getSnapshot(),
        });
        return;
      }

      if (hostEngine) {
        hostEngine.handlePeerMessage(selfSenderId, msg);
        return;
      }

      if (msg.type === 'room:join') {
        const targetCode = msg.roomCode.trim().toUpperCase();
        joinedRoomCode = targetCode;
        joinedSuccess = false;
        clearJoinTimeout();
        joinTimeout = setTimeout(() => {
          if (!hostEngine && !joinedSuccess && joinedRoomCode === targetCode) {
            onMessage({
              type: 'room:error',
              message:
                'Host room tidak merespons di meja Owlbear. Pastikan Host sedang membuka panel game Hoenn Detective Agency.',
            });
          }
        }, 3500);

        const envelope: ClientEnvelope = {
          kind: 'msg',
          roomCode: targetCode,
          senderId: selfSenderId,
          payload: msg,
        };
        void OBR.broadcast.sendMessage(CHANNEL_CLIENT, envelope, { destination: 'REMOTE' });
        return;
      }

      if (joinedRoomCode) {
        const envelope: ClientEnvelope = {
          kind: 'msg',
          roomCode: joinedRoomCode,
          senderId: selfSenderId,
          payload: msg,
        };
        void OBR.broadcast.sendMessage(CHANNEL_CLIENT, envelope, { destination: 'REMOTE' });
      }
    },
    close() {
      destroyed = true;
      if (joinTimeout) {
        clearTimeout(joinTimeout);
        joinTimeout = null;
      }
      if (hostEngine) {
        hostEngine.removePeer(selfSenderId);
        hostEngine.destroy();
        hostEngine = null;
      } else if (joinedRoomCode && OBR.isAvailable && OBR.isReady) {
        const envelope: ClientEnvelope = {
          kind: 'leave',
          roomCode: joinedRoomCode,
          senderId: selfSenderId,
        };
        void OBR.broadcast.sendMessage(CHANNEL_CLIENT, envelope, { destination: 'REMOTE' });
      }
      joinedRoomCode = null;
      unsubClient?.();
      unsubServer?.();
      unsubClient = null;
      unsubServer = null;
    },
  };
}
