export type GamePhase =
  | 'LOBBY'
  | 'CRIME_SCENE'
  | 'INVESTIGATION_BOARD'
  | 'VERDICT'
  | 'RESULT';

export type ClueType = 'PHYSICAL' | 'DOCUMENT' | 'RESIDUE' | 'OBJECT' | 'POKEMON_TRACE';

export type LogCategory = 'SYSTEM' | 'CLUE' | 'PENALTY' | 'INTERROGATION' | 'VOTE';

export interface InvestigationLogEntry {
  id: string;
  timestamp: number;
  phase: GamePhase;
  category: LogCategory;
  actorName?: string;
  actorColor?: string;
  message: string;
}

export interface CrimeSceneInfo {
  sceneId: string;
  title: string;
  subtitle: string;
}

export interface ClueHotspot {
  /** Normalized 1920x1080 top-left X coordinate */
  x: number;
  /** Normalized 1920x1080 top-left Y coordinate */
  y: number;
  width: number;
  height: number;
}

export interface KillerTrait {
  traitId: string;
  label: string;
  shortTag: string;
}

export interface ClueItem {
  clueID: string;
  scene: string;
  name: string;
  description: string;
  type: ClueType;
  linkedSuspectIDs: string[];
  hotspot: ClueHotspot;
  found: boolean;
  foundByPlayerName?: string;
  unlocksTraitId?: string;
}

export interface SuspectItem {
  suspectID: string;
  name: string;
  role: string;
  affiliation: string;
  alibiSummary: string;
  pokemonPartnerId: string;
  pokemonPartnerName: string;
  startNodeId: string;
  traits: string[];
}

export interface PokemonOption {
  pokemonId: string;
  name: string;
  elementType: string;
  traitHint: string;
}

export interface DialogueChoice {
  id: string;
  label: string;
  nextNodeId: string;
  requiredClueId?: string;
  unlocksHint?: string;
  unlocksTraitId?: string;
}

export interface DialogueNode {
  nodeId: string;
  speaker: string;
  text: string;
  choices: DialogueChoice[];
}

export interface CaseData {
  caseId: string;
  title: string;
  location: string;
  briefing: string;
  crimeSceneTimeSeconds: number;
  boardTimeSeconds: number;
  verdictTimeSeconds: number;
  solutionCulpritId: string;
  solutionPokemonId: string;
  solutionExplanation: string;
  scenes: CrimeSceneInfo[];
  clues: ClueItem[];
  suspects: SuspectItem[];
  pokemonOptions: PokemonOption[];
  killerTraits: KillerTrait[];
  dialogueNodes: Record<string, DialogueNode>;
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  isSpectator: boolean;
  connected: boolean;
  currentSceneId: string;
  cursorX: number;
  cursorY: number;
  penaltyUntil: number;
}

export interface VoteRecord {
  culpritId: string;
  pokemonId: string;
  submittedAt: number;
}

export interface VerdictSummary {
  winningCulpritId: string;
  winningPokemonId: string;
  isTeamCorrect: boolean;
  culpritCorrect: boolean;
  pokemonCorrect: boolean;
  culpritTallies: Record<string, number>;
  pokemonTallies: Record<string, number>;
  playerVotes: Array<{
    playerId: string;
    playerName: string;
    playerColor: string;
    culpritId: string;
    pokemonId: string;
  }>;
  solutionCulpritId: string;
  solutionPokemonId: string;
  solutionExplanation: string;
}

export interface RoomSnapshot {
  roomCode: string;
  hostId: string;
  sessionLocked: boolean;
  phase: GamePhase;
  timeRemaining: number;
  score: number;
  comboCount: number;
  comboExpiresAt: number;
  caseData: CaseData;
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

export type ClientMessage =
  | { type: 'room:create'; playerName: string }
  | { type: 'room:join'; roomCode: string; playerName: string }
  | { type: 'room:start_game' }
  | { type: 'room:restart_lobby' }
  | { type: 'scene:select'; sceneId: string }
  | { type: 'cursor:move'; x: number; y: number }
  | { type: 'clue:click'; sceneId: string; clueId: string | null; x: number; y: number }
  | { type: 'phase:advance'; targetPhase: 'INVESTIGATION_BOARD' | 'VERDICT' }
  | { type: 'dialogue:select_suspect'; suspectId: string }
  | { type: 'dialogue:choose'; choiceId: string }
  | { type: 'vote:cast'; culpritId: string; pokemonId: string };

export type ServerMessage =
  | { type: 'room:joined'; playerId: string; snapshot: RoomSnapshot }
  | { type: 'room:state'; snapshot: RoomSnapshot }
  | { type: 'room:error'; message: string }
  | { type: 'room:closed'; reason: 'HOST_LEFT'; message: string }
  | { type: 'cursor:update'; playerId: string; sceneId: string; x: number; y: number }
  | {
      type: 'clue:result';
      status: 'FOUND' | 'ALREADY_FOUND' | 'MISS' | 'COOLDOWN';
      playerId: string;
      playerName: string;
      sceneId?: string;
      clueId?: string;
      clueName?: string;
      x: number;
      y: number;
      pointsEarned?: number;
      comboMultiplier?: number;
      penaltySeconds?: number;
      cooldownMs?: number;
    }
  | { type: 'notice:info'; message: string };
