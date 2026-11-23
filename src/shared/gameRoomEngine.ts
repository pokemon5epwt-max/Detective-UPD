import { createFreshCaseData } from './caseData';
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
} from './types';

export const MAX_DETECTIVE_PLAYERS = 5;
export const DETECTIVE_PLAYER_COLORS = ['#F59E0B', '#38BDF8', '#10B981', '#F472B6', '#A78BFA'];

export interface CompactRoomState {
  roomCode: string;
  hostId: string;
  sessionLocked: boolean;
  phase: GamePhase;
  timeRemaining: number;
  score: number;
  comboCount: number;
  comboExpiresAt: number;
  foundClues: Array<{ clueID: string; foundByPlayerName?: string }>;
  players: PlayerState[];
  activeDialogue: {
    suspectId: string;
    currentNodeId: string;
    unlockedHints: string[];
  };
  unlockedTraitIds: string[];
  votedPlayerIds: string[];
  verdictSummary: VerdictSummary | null;
  investigationLogs: InvestigationLogEntry[];
}

export function compactSnapshot(snapshot: RoomSnapshot): CompactRoomState {
  return {
    roomCode: snapshot.roomCode,
    hostId: snapshot.hostId,
    sessionLocked: snapshot.sessionLocked,
    phase: snapshot.phase,
    timeRemaining: snapshot.timeRemaining,
    score: snapshot.score,
    comboCount: snapshot.comboCount,
    comboExpiresAt: snapshot.comboExpiresAt,
    foundClues: snapshot.caseData.clues
      .filter((c) => c.found)
      .map((c) => ({ clueID: c.clueID, foundByPlayerName: c.foundByPlayerName })),
    players: snapshot.players,
    activeDialogue: snapshot.activeDialogue,
    unlockedTraitIds: snapshot.unlockedTraitIds,
    votedPlayerIds: snapshot.votedPlayerIds,
    verdictSummary: snapshot.verdictSummary,
    investigationLogs: snapshot.investigationLogs.slice(-60),
  };
}

export function hydrateCompactSnapshot(compact: CompactRoomState): RoomSnapshot {
  const caseData = createFreshCaseData();
  const foundMap = new Map(compact.foundClues.map((c) => [c.clueID, c.foundByPlayerName]));
  for (const clue of caseData.clues) {
    if (foundMap.has(clue.clueID)) {
      clue.found = true;
      clue.foundByPlayerName = foundMap.get(clue.clueID);
    }
  }
  return {
    roomCode: compact.roomCode,
    hostId: compact.hostId,
    sessionLocked: compact.sessionLocked,
    phase: compact.phase,
    timeRemaining: compact.timeRemaining,
    score: compact.score,
    comboCount: compact.comboCount,
    comboExpiresAt: compact.comboExpiresAt,
    caseData,
    players: compact.players,
    activeDialogue: compact.activeDialogue,
    unlockedTraitIds: compact.unlockedTraitIds,
    votedPlayerIds: compact.votedPlayerIds,
    verdictSummary: compact.verdictSummary,
    investigationLogs: compact.investigationLogs,
  };
}

export class AuthoritativeRoomEngine {
  public readonly roomCode: string;
  public hostId: string;
  public sessionLocked = false;
  public phase: GamePhase = 'LOBBY';
  public timeRemaining: number;
  public score = 0;
  public comboCount = 0;
  public comboExpiresAt = 0;
  public caseData: CaseData;
  public players = new Map<string, PlayerState>();
  public peerIds = new Map<string, string>(); // peerKey -> playerId
  public foundClueIds = new Set<string>();
  public unlockedTraitIds = new Set<string>();
  public activeDialogue: {
    suspectId: string;
    currentNodeId: string;
    unlockedHints: string[];
  };
  public votes = new Map<string, VoteRecord>();
  public verdictSummary: VerdictSummary | null = null;
  public investigationLogs: InvestigationLogEntry[] = [];

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private transitionTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly sendToPeer: (peerKey: string, msg: ServerMessage) => void;
  private readonly broadcastAll: (msg: ServerMessage, excludePeerKey?: string) => void;

  constructor(
    hostPeerKey: string,
    hostName: string,
    callbacks: {
      sendToPeer: (peerKey: string, msg: ServerMessage) => void;
      broadcastAll: (msg: ServerMessage, excludePeerKey?: string) => void;
    }
  ) {
    this.sendToPeer = callbacks.sendToPeer;
    this.broadcastAll = callbacks.broadcastAll;

    this.roomCode = AuthoritativeRoomEngine.generateRoomCode();
    const playerId = AuthoritativeRoomEngine.generatePlayerId();
    this.hostId = playerId;
    this.caseData = createFreshCaseData();
    this.timeRemaining = this.caseData.crimeSceneTimeSeconds;
    this.activeDialogue = {
      suspectId: this.caseData.suspects[0].suspectID,
      currentNodeId: this.caseData.suspects[0].startNodeId,
      unlockedHints: [],
    };

    const cleanName = hostName.trim().slice(0, 20) || 'Detektif 1';
    const hostPlayer: PlayerState = {
      id: playerId,
      name: cleanName,
      color: DETECTIVE_PLAYER_COLORS[0],
      isHost: true,
      isSpectator: false,
      connected: true,
      currentSceneId: this.caseData.scenes[0].sceneId,
      cursorX: 960,
      cursorY: 540,
      penaltyUntil: 0,
    };

    this.players.set(playerId, hostPlayer);
    this.peerIds.set(hostPeerKey, playerId);
  }

  private static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private static generatePlayerId(): string {
    return `det_${Math.random().toString(36).slice(2, 10)}`;
  }

  public getSnapshot(): RoomSnapshot {
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      sessionLocked: this.sessionLocked,
      phase: this.phase,
      timeRemaining: this.timeRemaining,
      score: this.score,
      comboCount: this.comboCount,
      comboExpiresAt: this.comboExpiresAt,
      caseData: this.caseData,
      players: Array.from(this.players.values()),
      activeDialogue: {
        suspectId: this.activeDialogue.suspectId,
        currentNodeId: this.activeDialogue.currentNodeId,
        unlockedHints: [...this.activeDialogue.unlockedHints],
      },
      unlockedTraitIds: Array.from(this.unlockedTraitIds),
      votedPlayerIds: Array.from(this.votes.keys()),
      verdictSummary: this.verdictSummary,
      investigationLogs: [...this.investigationLogs],
    };
  }

  public clearTimers(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
  }

  public destroy(): void {
    this.clearTimers();
  }

  private appendLog(
    category: LogCategory,
    message: string,
    actor?: Pick<PlayerState, 'name' | 'color'>
  ): void {
    this.investigationLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      phase: this.phase,
      category,
      actorName: actor?.name,
      actorColor: actor?.color,
      message,
    });
    if (this.investigationLogs.length > 100) {
      this.investigationLogs.shift();
    }
  }

  private unlockKillerTrait(traitId: string | undefined): void {
    if (!traitId || this.unlockedTraitIds.has(traitId)) return;
    const trait = this.caseData.killerTraits.find((t) => t.traitId === traitId);
    if (!trait) return;
    this.unlockedTraitIds.add(traitId);
    this.appendLog('INTERROGATION', `Profil Pelaku terungkap: ${trait.label}`);
  }

  private pickWinningChoice(
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

  private resolveVerdict(): void {
    if (this.phase === 'RESULT') return;
    this.clearTimers();

    const culpritTallies: Record<string, number> = {};
    const pokemonTallies: Record<string, number> = {};
    const playerVotes: VerdictSummary['playerVotes'] = [];

    for (const [playerId, vote] of this.votes.entries()) {
      culpritTallies[vote.culpritId] = (culpritTallies[vote.culpritId] || 0) + 1;
      pokemonTallies[vote.pokemonId] = (pokemonTallies[vote.pokemonId] || 0) + 1;
      const player = this.players.get(playerId);
      playerVotes.push({
        playerId,
        playerName: player?.name || 'Detektif',
        playerColor: player?.color || '#94A3B8',
        culpritId: vote.culpritId,
        pokemonId: vote.pokemonId,
      });
    }

    const hostVote = this.votes.get(this.hostId);
    const winningCulpritId =
      playerVotes.length > 0
        ? this.pickWinningChoice(culpritTallies, hostVote?.culpritId, playerVotes[0].culpritId)
        : '';
    const winningPokemonId =
      playerVotes.length > 0
        ? this.pickWinningChoice(pokemonTallies, hostVote?.pokemonId, playerVotes[0].pokemonId)
        : '';

    const culpritCorrect = winningCulpritId === this.caseData.solutionCulpritId;
    const pokemonCorrect = winningPokemonId === this.caseData.solutionPokemonId;
    const isTeamCorrect = culpritCorrect && pokemonCorrect;

    if (culpritCorrect) this.score += 400;
    if (pokemonCorrect) this.score += 400;
    if (isTeamCorrect) this.score += Math.max(0, this.timeRemaining * 5);

    this.phase = 'RESULT';
    this.verdictSummary = {
      winningCulpritId,
      winningPokemonId,
      isTeamCorrect,
      culpritCorrect,
      pokemonCorrect,
      culpritTallies,
      pokemonTallies,
      playerVotes,
      solutionCulpritId: this.caseData.solutionCulpritId,
      solutionPokemonId: this.caseData.solutionPokemonId,
      solutionExplanation: this.caseData.solutionExplanation,
    };

    this.appendLog(
      'SYSTEM',
      `Vonis final diumumkan: ${
        isTeamCorrect ? 'Kasus Terpecahkan!' : 'Vonis Tim Belum Tepat.'
      } (Skor akhir ${this.score})`
    );

    this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
  }

  private transitionToPhase(target: 'CRIME_SCENE' | 'INVESTIGATION_BOARD' | 'VERDICT'): void {
    this.clearTimers();
    this.phase = target;

    if (target === 'CRIME_SCENE') {
      this.timeRemaining = this.caseData.crimeSceneTimeSeconds;
      this.appendLog('SYSTEM', 'Fase 2_CrimeScene dimulai — 3 lokasi TKP dibuka untuk tim.');
    } else if (target === 'INVESTIGATION_BOARD') {
      this.timeRemaining = this.caseData.boardTimeSeconds;
      const firstSuspect = this.caseData.suspects[0];
      this.activeDialogue = {
        suspectId: firstSuspect.suspectID,
        currentNodeId: firstSuspect.startNodeId,
        unlockedHints: [...this.activeDialogue.unlockedHints],
      };
      this.appendLog('SYSTEM', 'Fase 3_InvestigationBoard dimulai — waktunya interogasi saksi.');
    } else if (target === 'VERDICT') {
      this.timeRemaining = this.caseData.verdictTimeSeconds;
      this.votes.clear();
      this.appendLog('SYSTEM', 'Fase 4_Verdict dimulai — seluruh detektif mengirim suara vonis.');
    }

    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining -= 1;
      }

      if (this.timeRemaining <= 0) {
        if (this.phase === 'CRIME_SCENE') {
          this.transitionToPhase('INVESTIGATION_BOARD');
          return;
        }
        if (this.phase === 'INVESTIGATION_BOARD') {
          this.transitionToPhase('VERDICT');
          return;
        }
        if (this.phase === 'VERDICT') {
          this.resolveVerdict();
          return;
        }
      }

      this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
    }, 1000);

    this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
  }

  public joinPeer(peerKey: string, playerName: string, requestedCode: string): void {
    if (requestedCode.trim().toUpperCase() !== this.roomCode) {
      this.sendToPeer(peerKey, { type: 'room:error', message: 'Kode room tidak ditemukan.' });
      return;
    }

    // Re-attach if same peer joins again
    const existingPid = this.peerIds.get(peerKey);
    if (existingPid && this.players.has(existingPid)) {
      this.sendToPeer(peerKey, {
        type: 'room:joined',
        playerId: existingPid,
        snapshot: this.getSnapshot(),
      });
      return;
    }

    const isLateJoin = this.sessionLocked || this.phase !== 'LOBBY';
    const activePlayers = Array.from(this.players.values()).filter((p) => !p.isSpectator);
    const spectators = Array.from(this.players.values()).filter((p) => p.isSpectator);

    if (!isLateJoin && activePlayers.length >= MAX_DETECTIVE_PLAYERS) {
      this.sendToPeer(peerKey, {
        type: 'room:error',
        message: 'Room sudah penuh (maksimal 5 detektif).',
      });
      return;
    }

    if (isLateJoin && spectators.length >= 10) {
      this.sendToPeer(peerKey, {
        type: 'room:error',
        message: 'Kapasitas penonton di room ini sudah penuh.',
      });
      return;
    }

    const usedColors = new Set(activePlayers.map((p) => p.color));
    const assignedColor = isLateJoin
      ? '#94A3B8'
      : DETECTIVE_PLAYER_COLORS.find((c) => !usedColors.has(c)) ||
        DETECTIVE_PLAYER_COLORS[activePlayers.length % DETECTIVE_PLAYER_COLORS.length];

    const playerId = AuthoritativeRoomEngine.generatePlayerId();
    const cleanName =
      playerName.trim().slice(0, 20) ||
      (isLateJoin ? `Penonton ${spectators.length + 1}` : `Detektif ${activePlayers.length + 1}`);
    const newPlayer: PlayerState = {
      id: playerId,
      name: cleanName,
      color: assignedColor,
      isHost: false,
      isSpectator: isLateJoin,
      connected: true,
      currentSceneId: this.caseData.scenes[0].sceneId,
      cursorX: 960,
      cursorY: 540,
      penaltyUntil: 0,
    };

    this.players.set(playerId, newPlayer);
    this.peerIds.set(peerKey, playerId);

    this.sendToPeer(peerKey, {
      type: 'room:joined',
      playerId,
      snapshot: this.getSnapshot(),
    });
    if (isLateJoin) {
      this.appendLog('SYSTEM', `${cleanName} bergabung sebagai penonton.`);
      this.broadcastAll(
        { type: 'notice:info', message: `${cleanName} bergabung sebagai penonton.` },
        peerKey
      );
    }
    this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() }, peerKey);
  }

  public removePeer(peerKey: string): boolean {
    const playerId = this.peerIds.get(peerKey);
    if (!playerId) return false;
    this.peerIds.delete(peerKey);

    const leavingPlayer = this.players.get(playerId);
    this.players.delete(playerId);

    if (playerId === this.hostId) {
      this.clearTimers();
      this.broadcastAll({
        type: 'room:closed',
        reason: 'HOST_LEFT',
        message: 'Host (Player 1) meninggalkan sesi. Room ditutup untuk seluruh detektif.',
      });
      return true;
    }

    if (leavingPlayer) {
      this.appendLog(
        'SYSTEM',
        `${leavingPlayer.name}${leavingPlayer.isSpectator ? ' (Penonton)' : ''} meninggalkan room.`
      );
      this.broadcastAll({
        type: 'notice:info',
        message: `${leavingPlayer.name}${leavingPlayer.isSpectator ? ' (Penonton)' : ''} terputus dari room.`,
      });
    }

    if (this.phase === 'VERDICT') {
      const activePlayerCount = Array.from(this.players.values()).filter((p) => !p.isSpectator).length;
      if (activePlayerCount > 0 && this.votes.size >= activePlayerCount) {
        this.resolveVerdict();
        return false;
      }
    }

    this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
    return false;
  }

  public handlePeerMessage(peerKey: string, msg: ClientMessage): void {
    const playerId = this.peerIds.get(peerKey);
    if (!playerId) return;
    const player = this.players.get(playerId);
    if (!player) return;

    switch (msg.type) {
      case 'room:start_game': {
        if (player.id !== this.hostId || this.phase !== 'LOBBY') return;
        this.sessionLocked = true;
        this.score = 0;
        this.comboCount = 0;
        this.comboExpiresAt = 0;
        this.foundClueIds.clear();
        this.unlockedTraitIds.clear();
        this.caseData = createFreshCaseData();
        this.activeDialogue.unlockedHints = [];
        this.verdictSummary = null;
        this.investigationLogs = [];
        for (const p of this.players.values()) {
          p.currentSceneId = this.caseData.scenes[0].sceneId;
          p.penaltyUntil = 0;
        }
        this.transitionToPhase('CRIME_SCENE');
        break;
      }

      case 'room:restart_lobby': {
        if (player.id !== this.hostId) return;
        this.clearTimers();
        this.sessionLocked = false;
        this.phase = 'LOBBY';
        this.score = 0;
        this.comboCount = 0;
        this.comboExpiresAt = 0;
        this.foundClueIds.clear();
        this.unlockedTraitIds.clear();
        this.votes.clear();
        this.caseData = createFreshCaseData();
        this.timeRemaining = this.caseData.crimeSceneTimeSeconds;
        this.activeDialogue = {
          suspectId: this.caseData.suspects[0].suspectID,
          currentNodeId: this.caseData.suspects[0].startNodeId,
          unlockedHints: [],
        };
        this.verdictSummary = null;
        this.investigationLogs = [];

        const activeList = Array.from(this.players.values()).filter((p) => !p.isSpectator);
        const usedColors = new Set(activeList.map((p) => p.color));
        let activeCount = activeList.length;
        for (const p of this.players.values()) {
          if (p.isSpectator && activeCount < MAX_DETECTIVE_PLAYERS) {
            p.isSpectator = false;
            const nextColor =
              DETECTIVE_PLAYER_COLORS.find((c) => !usedColors.has(c)) ||
              DETECTIVE_PLAYER_COLORS[activeCount % DETECTIVE_PLAYER_COLORS.length];
            p.color = nextColor;
            usedColors.add(nextColor);
            activeCount += 1;
          }
        }

        for (const p of this.players.values()) {
          p.currentSceneId = this.caseData.scenes[0].sceneId;
          p.penaltyUntil = 0;
        }

        this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
        break;
      }

      case 'scene:select': {
        if (player.isSpectator || this.phase !== 'CRIME_SCENE') return;
        if (!this.caseData.scenes.some((s) => s.sceneId === msg.sceneId)) return;
        player.currentSceneId = msg.sceneId;
        this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
        break;
      }

      case 'cursor:move': {
        if (player.isSpectator) return;
        const x = Math.max(0, Math.min(1920, Math.round(msg.x)));
        const y = Math.max(0, Math.min(1080, Math.round(msg.y)));
        player.cursorX = x;
        player.cursorY = y;
        this.broadcastAll(
          {
            type: 'cursor:update',
            playerId: player.id,
            sceneId: player.currentSceneId,
            x,
            y,
          },
          peerKey
        );
        break;
      }

      case 'clue:click': {
        if (player.isSpectator || this.phase !== 'CRIME_SCENE') return;
        const targetSceneId = msg.sceneId || player.currentSceneId;
        if (!this.caseData.scenes.some((s) => s.sceneId === targetSceneId)) return;

        const now = Date.now();
        if (player.penaltyUntil > now) {
          this.sendToPeer(peerKey, {
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
        const matchedClue = this.caseData.clues.find((clue) => {
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
            this.caseData.scenes.find((s) => s.sceneId === targetSceneId)?.title || targetSceneId;
          this.timeRemaining = Math.max(0, this.timeRemaining - penaltySeconds);
          this.comboCount = 0;
          this.comboExpiresAt = 0;
          player.penaltyUntil = now + 1500;
          this.appendLog(
            'PENALTY',
            `Salah klik di ${sceneTitle} (-${penaltySeconds} detik).`,
            player
          );
          this.broadcastAll({
            type: 'clue:result',
            status: 'MISS',
            playerId: player.id,
            playerName: player.name,
            sceneId: targetSceneId,
            x: msg.x,
            y: msg.y,
            penaltySeconds,
          });
          if (this.timeRemaining <= 0) {
            this.transitionToPhase('INVESTIGATION_BOARD');
          } else {
            this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
          }
          return;
        }

        if (this.foundClueIds.has(matchedClue.clueID)) {
          this.sendToPeer(peerKey, {
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

        this.foundClueIds.add(matchedClue.clueID);
        matchedClue.found = true;
        matchedClue.foundByPlayerName = player.name;

        if (now <= this.comboExpiresAt) {
          this.comboCount += 1;
        } else {
          this.comboCount = 1;
        }
        this.comboExpiresAt = now + 12000;
        const comboMultiplier = Math.min(5, this.comboCount);
        const pointsEarned = 150 * comboMultiplier;
        this.score += pointsEarned;

        const sceneTitle =
          this.caseData.scenes.find((s) => s.sceneId === targetSceneId)?.title || targetSceneId;
        this.appendLog(
          'CLUE',
          `Menemukan bukti: ${matchedClue.name} di ${sceneTitle} (+${pointsEarned} skor${
            comboMultiplier > 1 ? ` · Combo x${comboMultiplier}` : ''
          }).`,
          player
        );
        this.unlockKillerTrait(matchedClue.unlocksTraitId);

        this.broadcastAll({
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
        this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });

        if (this.foundClueIds.size >= this.caseData.clues.length && !this.transitionTimeout) {
          this.transitionTimeout = setTimeout(() => {
            if (this.phase === 'CRIME_SCENE') {
              this.transitionToPhase('INVESTIGATION_BOARD');
            }
          }, 1400);
        }
        break;
      }

      case 'phase:advance': {
        if (player.id !== this.hostId) return;
        if (msg.targetPhase === 'INVESTIGATION_BOARD' && this.phase === 'CRIME_SCENE') {
          this.transitionToPhase('INVESTIGATION_BOARD');
        } else if (msg.targetPhase === 'VERDICT' && this.phase === 'INVESTIGATION_BOARD') {
          this.transitionToPhase('VERDICT');
        }
        break;
      }

      case 'dialogue:select_suspect': {
        if (player.isSpectator || this.phase !== 'INVESTIGATION_BOARD') return;
        const suspect = this.caseData.suspects.find((s) => s.suspectID === msg.suspectId);
        if (!suspect) return;
        if (this.activeDialogue.suspectId !== suspect.suspectID) {
          this.appendLog('INTERROGATION', `Membuka interogasi dengan ${suspect.name}.`, player);
        }
        this.activeDialogue.suspectId = suspect.suspectID;
        this.activeDialogue.currentNodeId = suspect.startNodeId;
        this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
        break;
      }

      case 'dialogue:choose': {
        if (player.isSpectator || this.phase !== 'INVESTIGATION_BOARD') return;
        const currentNode = this.caseData.dialogueNodes[this.activeDialogue.currentNodeId];
        if (!currentNode) return;
        const choice = currentNode.choices.find((c) => c.id === msg.choiceId);
        if (!choice) return;
        if (choice.requiredClueId && !this.foundClueIds.has(choice.requiredClueId)) {
          this.sendToPeer(peerKey, {
            type: 'notice:info',
            message: 'Bukti terkait belum ditemukan di TKP.',
          });
          return;
        }
        if (!this.caseData.dialogueNodes[choice.nextNodeId]) return;

        this.activeDialogue.currentNodeId = choice.nextNodeId;
        if (!choice.label.startsWith('Kembali') && !choice.label.startsWith('Catat')) {
          const suspect = this.caseData.suspects.find(
            (s) => s.suspectID === this.activeDialogue.suspectId
          );
          this.appendLog(
            'INTERROGATION',
            `Menanyakan ${suspect?.name || 'Saksi'}: "${choice.label}"`,
            player
          );
        }
        if (
          choice.unlocksHint &&
          !this.activeDialogue.unlockedHints.includes(choice.unlocksHint)
        ) {
          this.activeDialogue.unlockedHints.push(choice.unlocksHint);
          this.score += 50;
          this.appendLog(
            'INTERROGATION',
            `Fakta baru terbuka (+50 skor): ${choice.unlocksHint}`
          );
        }
        this.unlockKillerTrait(choice.unlocksTraitId);
        this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
        break;
      }

      case 'vote:cast': {
        if (player.isSpectator || this.phase !== 'VERDICT') return;
        if (this.votes.has(player.id)) return;
        const validCulprit = this.caseData.suspects.some((s) => s.suspectID === msg.culpritId);
        const validPokemon = this.caseData.pokemonOptions.some(
          (p) => p.pokemonId === msg.pokemonId
        );
        if (!validCulprit || !validPokemon) return;

        this.votes.set(player.id, {
          culpritId: msg.culpritId,
          pokemonId: msg.pokemonId,
          submittedAt: Date.now(),
        });
        this.appendLog('VOTE', 'Telah mengirim suara vonis.', player);

        const activePlayerCount = Array.from(this.players.values()).filter(
          (p) => !p.isSpectator
        ).length;
        if (this.votes.size >= activePlayerCount) {
          this.resolveVerdict();
        } else {
          this.broadcastAll({ type: 'room:state', snapshot: this.getSnapshot() });
        }
        break;
      }
    }
  }
}
