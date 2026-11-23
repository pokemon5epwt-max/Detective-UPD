import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createFreshCaseData } from './src/shared/caseData';
import type {
  CaseData,
  ClientMessage,
  GamePhase,
  InvestigationLogEntry,
  LogCategory,
  PlayerState,
  RoomSnapshot,
  ServerMessage,
  VerdictSummary,
  VoteRecord,
} from './src/shared/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_PLAYERS = 5;
const PLAYER_COLORS = ['#F59E0B', '#38BDF8', '#10B981', '#F472B6', '#A78BFA'];

interface ServerRoom {
  roomCode: string;
  hostId: string;
  sessionLocked: boolean;
  phase: GamePhase;
  timeRemaining: number;
  score: number;
  comboCount: number;
  comboExpiresAt: number;
  caseData: CaseData;
  players: Map<string, PlayerState>;
  sockets: Map<string, WebSocket>;
  foundClueIds: Set<string>;
  unlockedTraitIds: Set<string>;
  activeDialogue: {
    suspectId: string;
    currentNodeId: string;
    unlockedHints: string[];
  };
  votes: Map<string, VoteRecord>;
  verdictSummary: VerdictSummary | null;
  investigationLogs: InvestigationLogEntry[];
  timerInterval: ReturnType<typeof setInterval> | null;
  transitionTimeout: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, ServerRoom>();
const socketMeta = new Map<WebSocket, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generatePlayerId(): string {
  return `det_${Math.random().toString(36).slice(2, 10)}`;
}

function sendToSocket(ws: WebSocket | undefined, msg: ServerMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToRoom(room: ServerRoom, msg: ServerMessage, excludePlayerId?: string): void {
  const serialized = JSON.stringify(msg);
  for (const [pid, ws] of room.sockets.entries()) {
    if (excludePlayerId && pid === excludePlayerId) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(serialized);
    }
  }
}

function appendLog(
  room: ServerRoom,
  category: LogCategory,
  message: string,
  actor?: Pick<PlayerState, 'name' | 'color'>
): void {
  const entry: InvestigationLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
    phase: room.phase,
    category,
    actorName: actor?.name,
    actorColor: actor?.color,
    message,
  };
  room.investigationLogs.push(entry);
  if (room.investigationLogs.length > 100) {
    room.investigationLogs.shift();
  }
}

function unlockKillerTrait(room: ServerRoom, traitId: string | undefined): void {
  if (!traitId || room.unlockedTraitIds.has(traitId)) return;
  const trait = room.caseData.killerTraits.find((t) => t.traitId === traitId);
  if (!trait) return;
  room.unlockedTraitIds.add(traitId);
  appendLog(room, 'INTERROGATION', `Profil Pelaku terungkap: ${trait.label}`);
}

function buildSnapshot(room: ServerRoom): RoomSnapshot {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    sessionLocked: room.sessionLocked,
    phase: room.phase,
    timeRemaining: room.timeRemaining,
    score: room.score,
    comboCount: room.comboCount,
    comboExpiresAt: room.comboExpiresAt,
    caseData: room.caseData,
    players: Array.from(room.players.values()),
    activeDialogue: {
      suspectId: room.activeDialogue.suspectId,
      currentNodeId: room.activeDialogue.currentNodeId,
      unlockedHints: [...room.activeDialogue.unlockedHints],
    },
    unlockedTraitIds: Array.from(room.unlockedTraitIds),
    votedPlayerIds: Array.from(room.votes.keys()),
    verdictSummary: room.verdictSummary,
    investigationLogs: [...room.investigationLogs],
  };
}

function clearRoomTimers(room: ServerRoom): void {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.transitionTimeout) {
    clearTimeout(room.transitionTimeout);
    room.transitionTimeout = null;
  }
}

function pickWinningChoice(
  tallies: Record<string, number>,
  hostChoice: string | undefined,
  fallbackId: string
): string {
  let bestId = fallbackId;
  let bestCount = -1;
  for (const [id, count] of Object.entries(tallies)) {
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    } else if (count === bestCount && hostChoice === id) {
      bestId = id;
    }
  }
  return bestId;
}

function resolveVerdict(room: ServerRoom): void {
  if (room.phase === 'RESULT') return;
  clearRoomTimers(room);

  const culpritTallies: Record<string, number> = {};
  const pokemonTallies: Record<string, number> = {};
  const playerVotes: VerdictSummary['playerVotes'] = [];

  for (const [playerId, vote] of room.votes.entries()) {
    culpritTallies[vote.culpritId] = (culpritTallies[vote.culpritId] || 0) + 1;
    pokemonTallies[vote.pokemonId] = (pokemonTallies[vote.pokemonId] || 0) + 1;
    const player = room.players.get(playerId);
    playerVotes.push({
      playerId,
      playerName: player?.name || 'Detektif',
      playerColor: player?.color || '#94A3B8',
      culpritId: vote.culpritId,
      pokemonId: vote.pokemonId,
    });
  }

  const hostVote = room.votes.get(room.hostId);
  const winningCulpritId =
    playerVotes.length > 0
      ? pickWinningChoice(culpritTallies, hostVote?.culpritId, playerVotes[0].culpritId)
      : '';
  const winningPokemonId =
    playerVotes.length > 0
      ? pickWinningChoice(pokemonTallies, hostVote?.pokemonId, playerVotes[0].pokemonId)
      : '';

  const culpritCorrect = winningCulpritId === room.caseData.solutionCulpritId;
  const pokemonCorrect = winningPokemonId === room.caseData.solutionPokemonId;
  const isTeamCorrect = culpritCorrect && pokemonCorrect;

  if (culpritCorrect) room.score += 400;
  if (pokemonCorrect) room.score += 400;
  if (isTeamCorrect) room.score += Math.max(0, room.timeRemaining * 5);

  room.phase = 'RESULT';
  room.verdictSummary = {
    winningCulpritId,
    winningPokemonId,
    isTeamCorrect,
    culpritCorrect,
    pokemonCorrect,
    culpritTallies,
    pokemonTallies,
    playerVotes,
    solutionCulpritId: room.caseData.solutionCulpritId,
    solutionPokemonId: room.caseData.solutionPokemonId,
    solutionExplanation: room.caseData.solutionExplanation,
  };

  appendLog(
    room,
    'SYSTEM',
    `Vonis final diumumkan: ${
      isTeamCorrect ? 'Kasus Terpecahkan!' : 'Vonis Tim Belum Tepat.'
    } (Skor akhir ${room.score})`
  );

  broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
}

function transitionToPhase(room: ServerRoom, target: 'CRIME_SCENE' | 'INVESTIGATION_BOARD' | 'VERDICT'): void {
  clearRoomTimers(room);
  room.phase = target;

  if (target === 'CRIME_SCENE') {
    room.timeRemaining = room.caseData.crimeSceneTimeSeconds;
    appendLog(room, 'SYSTEM', 'Fase 2_CrimeScene dimulai — 3 lokasi TKP dibuka untuk tim.');
  } else if (target === 'INVESTIGATION_BOARD') {
    room.timeRemaining = room.caseData.boardTimeSeconds;
    const firstSuspect = room.caseData.suspects[0];
    room.activeDialogue = {
      suspectId: firstSuspect.suspectID,
      currentNodeId: firstSuspect.startNodeId,
      unlockedHints: [...room.activeDialogue.unlockedHints],
    };
    appendLog(room, 'SYSTEM', 'Fase 3_InvestigationBoard dimulai — waktunya interogasi saksi.');
  } else if (target === 'VERDICT') {
    room.timeRemaining = room.caseData.verdictTimeSeconds;
    room.votes.clear();
    appendLog(room, 'SYSTEM', 'Fase 4_Verdict dimulai — seluruh detektif mengirim suara vonis.');
  }

  room.timerInterval = setInterval(() => {
    if (!rooms.has(room.roomCode)) {
      clearRoomTimers(room);
      return;
    }
    if (room.timeRemaining > 0) {
      room.timeRemaining -= 1;
    }

    if (room.timeRemaining <= 0) {
      if (room.phase === 'CRIME_SCENE') {
        transitionToPhase(room, 'INVESTIGATION_BOARD');
        return;
      }
      if (room.phase === 'INVESTIGATION_BOARD') {
        transitionToPhase(room, 'VERDICT');
        return;
      }
      if (room.phase === 'VERDICT') {
        resolveVerdict(room);
        return;
      }
    }

    broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
  }, 1000);

  broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
}

function handleDisconnect(ws: WebSocket): void {
  const meta = socketMeta.get(ws);
  if (!meta) return;
  socketMeta.delete(ws);

  const room = rooms.get(meta.roomCode);
  if (!room) return;

  const leavingPlayer = room.players.get(meta.playerId);
  room.players.delete(meta.playerId);
  room.sockets.delete(meta.playerId);

  if (meta.playerId === room.hostId) {
    clearRoomTimers(room);
    broadcastToRoom(room, {
      type: 'room:closed',
      reason: 'HOST_LEFT',
      message: 'Host (Player 1) meninggalkan sesi. Room ditutup untuk seluruh detektif.',
    });
    for (const peerWs of room.sockets.values()) {
      socketMeta.delete(peerWs);
    }
    rooms.delete(room.roomCode);
    return;
  }

  if (leavingPlayer) {
    appendLog(
      room,
      'SYSTEM',
      `${leavingPlayer.name}${leavingPlayer.isSpectator ? ' (Penonton)' : ''} meninggalkan room.`
    );
    broadcastToRoom(room, {
      type: 'notice:info',
      message: `${leavingPlayer.name}${leavingPlayer.isSpectator ? ' (Penonton)' : ''} terputus dari room.`,
    });
  }

  if (room.phase === 'VERDICT') {
    const activePlayerCount = Array.from(room.players.values()).filter((p) => !p.isSpectator).length;
    if (activePlayerCount > 0 && room.votes.size >= activePlayerCount) {
      resolveVerdict(room);
      return;
    }
  }

  broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
}

async function startServer(): Promise<void> {
  const app = express();
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        sendToSocket(ws, { type: 'room:error', message: 'Format pesan tidak valid.' });
        return;
      }

      if (msg.type === 'room:create') {
        const cleanName = msg.playerName.trim().slice(0, 20) || 'Detektif 1';
        const roomCode = generateRoomCode();
        const playerId = generatePlayerId();
        const caseData = createFreshCaseData();

        const hostPlayer: PlayerState = {
          id: playerId,
          name: cleanName,
          color: PLAYER_COLORS[0],
          isHost: true,
          isSpectator: false,
          connected: true,
          currentSceneId: caseData.scenes[0].sceneId,
          cursorX: 960,
          cursorY: 540,
          penaltyUntil: 0,
        };

        const room: ServerRoom = {
          roomCode,
          hostId: playerId,
          sessionLocked: false,
          phase: 'LOBBY',
          timeRemaining: caseData.crimeSceneTimeSeconds,
          score: 0,
          comboCount: 0,
          comboExpiresAt: 0,
          caseData,
          players: new Map([[playerId, hostPlayer]]),
          sockets: new Map([[playerId, ws]]),
          foundClueIds: new Set(),
          unlockedTraitIds: new Set(),
          activeDialogue: {
            suspectId: caseData.suspects[0].suspectID,
            currentNodeId: caseData.suspects[0].startNodeId,
            unlockedHints: [],
          },
          votes: new Map(),
          verdictSummary: null,
          investigationLogs: [],
          timerInterval: null,
          transitionTimeout: null,
        };

        rooms.set(roomCode, room);
        socketMeta.set(ws, { roomCode, playerId });
        sendToSocket(ws, { type: 'room:joined', playerId, snapshot: buildSnapshot(room) });
        return;
      }

      if (msg.type === 'room:join') {
        const normalizedCode = msg.roomCode.trim().toUpperCase();
        const room = rooms.get(normalizedCode);
        if (!room) {
          sendToSocket(ws, { type: 'room:error', message: 'Kode room tidak ditemukan.' });
          return;
        }
        const isLateJoin = room.sessionLocked || room.phase !== 'LOBBY';
        const activePlayers = Array.from(room.players.values()).filter((p) => !p.isSpectator);
        const spectators = Array.from(room.players.values()).filter((p) => p.isSpectator);

        if (!isLateJoin && activePlayers.length >= MAX_PLAYERS) {
          sendToSocket(ws, {
            type: 'room:error',
            message: 'Room sudah penuh (maksimal 5 detektif).',
          });
          return;
        }

        if (isLateJoin && spectators.length >= 10) {
          sendToSocket(ws, {
            type: 'room:error',
            message: 'Kapasitas penonton di room ini sudah penuh.',
          });
          return;
        }

        const usedColors = new Set(activePlayers.map((p) => p.color));
        const assignedColor = isLateJoin
          ? '#94A3B8'
          : PLAYER_COLORS.find((c) => !usedColors.has(c)) ||
            PLAYER_COLORS[activePlayers.length % PLAYER_COLORS.length];

        const playerId = generatePlayerId();
        const cleanName =
          msg.playerName.trim().slice(0, 20) ||
          (isLateJoin ? `Penonton ${spectators.length + 1}` : `Detektif ${activePlayers.length + 1}`);
        const newPlayer: PlayerState = {
          id: playerId,
          name: cleanName,
          color: assignedColor,
          isHost: false,
          isSpectator: isLateJoin,
          connected: true,
          currentSceneId: room.caseData.scenes[0].sceneId,
          cursorX: 960,
          cursorY: 540,
          penaltyUntil: 0,
        };

        room.players.set(playerId, newPlayer);
        room.sockets.set(playerId, ws);
        socketMeta.set(ws, { roomCode: normalizedCode, playerId });

        sendToSocket(ws, { type: 'room:joined', playerId, snapshot: buildSnapshot(room) });
        if (isLateJoin) {
          appendLog(room, 'SYSTEM', `${cleanName} bergabung sebagai penonton.`);
          broadcastToRoom(
            room,
            { type: 'notice:info', message: `${cleanName} bergabung sebagai penonton.` },
            playerId
          );
        }
        broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) }, playerId);
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const player = room.players.get(meta.playerId);
      if (!player) return;

      switch (msg.type) {
        case 'room:start_game': {
          if (player.id !== room.hostId) return;
          if (room.phase !== 'LOBBY') return;
          room.sessionLocked = true;
          room.score = 0;
          room.comboCount = 0;
          room.comboExpiresAt = 0;
          room.foundClueIds.clear();
          room.unlockedTraitIds.clear();
          room.caseData = createFreshCaseData();
          room.activeDialogue.unlockedHints = [];
          room.verdictSummary = null;
          room.investigationLogs = [];
          for (const p of room.players.values()) {
            p.currentSceneId = room.caseData.scenes[0].sceneId;
            p.penaltyUntil = 0;
          }
          transitionToPhase(room, 'CRIME_SCENE');
          break;
        }

        case 'room:restart_lobby': {
          if (player.id !== room.hostId) return;
          clearRoomTimers(room);
          room.sessionLocked = false;
          room.phase = 'LOBBY';
          room.score = 0;
          room.comboCount = 0;
          room.comboExpiresAt = 0;
          room.foundClueIds.clear();
          room.unlockedTraitIds.clear();
          room.votes.clear();
          room.caseData = createFreshCaseData();
          room.timeRemaining = room.caseData.crimeSceneTimeSeconds;
          room.activeDialogue = {
            suspectId: room.caseData.suspects[0].suspectID,
            currentNodeId: room.caseData.suspects[0].startNodeId,
            unlockedHints: [],
          };
          room.verdictSummary = null;
          room.investigationLogs = [];

          // Promote waiting spectators into open detective slots (up to MAX_PLAYERS)
          const activeList = Array.from(room.players.values()).filter((p) => !p.isSpectator);
          const usedColors = new Set(activeList.map((p) => p.color));
          let activeCount = activeList.length;
          for (const p of room.players.values()) {
            if (p.isSpectator && activeCount < MAX_PLAYERS) {
              p.isSpectator = false;
              const nextColor =
                PLAYER_COLORS.find((c) => !usedColors.has(c)) ||
                PLAYER_COLORS[activeCount % PLAYER_COLORS.length];
              p.color = nextColor;
              usedColors.add(nextColor);
              activeCount += 1;
            }
          }

          for (const p of room.players.values()) {
            p.currentSceneId = room.caseData.scenes[0].sceneId;
            p.penaltyUntil = 0;
          }

          broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
          break;
        }

        case 'scene:select': {
          if (player.isSpectator) return;
          if (room.phase !== 'CRIME_SCENE') return;
          const validScene = room.caseData.scenes.some((s) => s.sceneId === msg.sceneId);
          if (!validScene) return;
          player.currentSceneId = msg.sceneId;
          broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
          break;
        }

        case 'cursor:move': {
          if (player.isSpectator) return;
          const x = Math.max(0, Math.min(1920, Math.round(msg.x)));
          const y = Math.max(0, Math.min(1080, Math.round(msg.y)));
          player.cursorX = x;
          player.cursorY = y;
          broadcastToRoom(
            room,
            {
              type: 'cursor:update',
              playerId: player.id,
              sceneId: player.currentSceneId,
              x,
              y,
            },
            player.id
          );
          break;
        }

        case 'clue:click': {
          if (player.isSpectator) return;
          if (room.phase !== 'CRIME_SCENE') return;
          const targetSceneId = msg.sceneId || player.currentSceneId;
          if (!room.caseData.scenes.some((s) => s.sceneId === targetSceneId)) return;

          const now = Date.now();
          if (player.penaltyUntil > now) {
            sendToSocket(ws, {
              type: 'clue:result',
              status: 'COOLDOWN',
              playerId: player.id,
              playerName: player.name,
              sceneId: targetSceneId,
              x: msg.x,
              y: msg.y,
              cooldownMs: player.penaltyUntil - now,
            });
            return;
          }

          const tolerance = 18;
          const matchedClue = room.caseData.clues.find((clue) => {
            if (clue.scene !== targetSceneId) return false;
            if (msg.clueId && clue.clueID !== msg.clueId) return false;
            return (
              msg.x >= clue.hotspot.x - tolerance &&
              msg.x <= clue.hotspot.x + clue.hotspot.width + tolerance &&
              msg.y >= clue.hotspot.y - tolerance &&
              msg.y <= clue.hotspot.y + clue.hotspot.height + tolerance
            );
          });

          if (!matchedClue) {
            const penaltySeconds = 10;
            const sceneTitle =
              room.caseData.scenes.find((s) => s.sceneId === targetSceneId)?.title || targetSceneId;
            room.timeRemaining = Math.max(0, room.timeRemaining - penaltySeconds);
            room.comboCount = 0;
            room.comboExpiresAt = 0;
            player.penaltyUntil = now + 1500;
            appendLog(room, 'PENALTY', `Salah klik di ${sceneTitle} (-${penaltySeconds} detik).`, player);
            broadcastToRoom(room, {
              type: 'clue:result',
              status: 'MISS',
              playerId: player.id,
              playerName: player.name,
              sceneId: targetSceneId,
              x: msg.x,
              y: msg.y,
              penaltySeconds,
            });
            if (room.timeRemaining <= 0) {
              transitionToPhase(room, 'INVESTIGATION_BOARD');
            } else {
              broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
            }
            return;
          }

          if (room.foundClueIds.has(matchedClue.clueID)) {
            sendToSocket(ws, {
              type: 'clue:result',
              status: 'ALREADY_FOUND',
              playerId: player.id,
              playerName: player.name,
              sceneId: targetSceneId,
              clueId: matchedClue.clueID,
              clueName: matchedClue.name,
              x: msg.x,
              y: msg.y,
            });
            return;
          }

          room.foundClueIds.add(matchedClue.clueID);
          matchedClue.found = true;
          matchedClue.foundByPlayerName = player.name;

          if (now <= room.comboExpiresAt) {
            room.comboCount += 1;
          } else {
            room.comboCount = 1;
          }
          room.comboExpiresAt = now + 12000;
          const comboMultiplier = Math.min(5, room.comboCount);
          const pointsEarned = 150 * comboMultiplier;
          room.score += pointsEarned;

          const sceneTitle =
            room.caseData.scenes.find((s) => s.sceneId === targetSceneId)?.title || targetSceneId;
          appendLog(
            room,
            'CLUE',
            `Menemukan bukti: ${matchedClue.name} di ${sceneTitle} (+${pointsEarned} skor${
              comboMultiplier > 1 ? ` · Combo x${comboMultiplier}` : ''
            }).`,
            player
          );
          unlockKillerTrait(room, matchedClue.unlocksTraitId);

          broadcastToRoom(room, {
            type: 'clue:result',
            status: 'FOUND',
            playerId: player.id,
            playerName: player.name,
            sceneId: targetSceneId,
            clueId: matchedClue.clueID,
            clueName: matchedClue.name,
            x: matchedClue.hotspot.x + matchedClue.hotspot.width / 2,
            y: matchedClue.hotspot.y + matchedClue.hotspot.height / 2,
            pointsEarned,
            comboMultiplier,
          });
          broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });

          if (room.foundClueIds.size >= room.caseData.clues.length && !room.transitionTimeout) {
            room.transitionTimeout = setTimeout(() => {
              if (room.phase === 'CRIME_SCENE') {
                transitionToPhase(room, 'INVESTIGATION_BOARD');
              }
            }, 1400);
          }
          break;
        }

        case 'phase:advance': {
          if (player.id !== room.hostId) return;
          if (msg.targetPhase === 'INVESTIGATION_BOARD' && room.phase === 'CRIME_SCENE') {
            transitionToPhase(room, 'INVESTIGATION_BOARD');
          } else if (msg.targetPhase === 'VERDICT' && room.phase === 'INVESTIGATION_BOARD') {
            transitionToPhase(room, 'VERDICT');
          }
          break;
        }

        case 'dialogue:select_suspect': {
          if (player.isSpectator) return;
          if (room.phase !== 'INVESTIGATION_BOARD') return;
          const suspect = room.caseData.suspects.find((s) => s.suspectID === msg.suspectId);
          if (!suspect) return;
          if (room.activeDialogue.suspectId !== suspect.suspectID) {
            appendLog(room, 'INTERROGATION', `Membuka interogasi dengan ${suspect.name}.`, player);
          }
          room.activeDialogue.suspectId = suspect.suspectID;
          room.activeDialogue.currentNodeId = suspect.startNodeId;
          broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
          break;
        }

        case 'dialogue:choose': {
          if (player.isSpectator) return;
          if (room.phase !== 'INVESTIGATION_BOARD') return;
          const currentNode = room.caseData.dialogueNodes[room.activeDialogue.currentNodeId];
          if (!currentNode) return;
          const choice = currentNode.choices.find((c) => c.id === msg.choiceId);
          if (!choice) return;
          if (choice.requiredClueId && !room.foundClueIds.has(choice.requiredClueId)) {
            sendToSocket(ws, {
              type: 'notice:info',
              message: 'Bukti terkait belum ditemukan di TKP.',
            });
            return;
          }
          if (!room.caseData.dialogueNodes[choice.nextNodeId]) return;

          room.activeDialogue.currentNodeId = choice.nextNodeId;
          if (!choice.label.startsWith('Kembali') && !choice.label.startsWith('Catat')) {
            const suspect = room.caseData.suspects.find(
              (s) => s.suspectID === room.activeDialogue.suspectId
            );
            appendLog(
              room,
              'INTERROGATION',
              `Menanyakan ${suspect?.name || 'Saksi'}: "${choice.label}"`,
              player
            );
          }
          if (
            choice.unlocksHint &&
            !room.activeDialogue.unlockedHints.includes(choice.unlocksHint)
          ) {
            room.activeDialogue.unlockedHints.push(choice.unlocksHint);
            room.score += 50;
            appendLog(room, 'INTERROGATION', `Fakta baru terbuka (+50 skor): ${choice.unlocksHint}`);
          }
          unlockKillerTrait(room, choice.unlocksTraitId);
          broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
          break;
        }

        case 'vote:cast': {
          if (player.isSpectator) return;
          if (room.phase !== 'VERDICT') return;
          if (room.votes.has(player.id)) return;
          const validCulprit = room.caseData.suspects.some((s) => s.suspectID === msg.culpritId);
          const validPokemon = room.caseData.pokemonOptions.some((p) => p.pokemonId === msg.pokemonId);
          if (!validCulprit || !validPokemon) return;

          room.votes.set(player.id, {
            culpritId: msg.culpritId,
            pokemonId: msg.pokemonId,
            submittedAt: Date.now(),
          });
          appendLog(room, 'VOTE', 'Telah mengirim suara vonis.', player);

          const activePlayerCount = Array.from(room.players.values()).filter((p) => !p.isSpectator).length;
          if (room.votes.size >= activePlayerCount) {
            resolveVerdict(room);
          } else {
            broadcastToRoom(room, { type: 'room:state', snapshot: buildSnapshot(room) });
          }
          break;
        }
      }
    });

    ws.on('close', () => handleDisconnect(ws));
    ws.on('error', () => handleDisconnect(ws));
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Hoenn Detective Agency server listening on port ${PORT}`);
  });
}

void startServer();
