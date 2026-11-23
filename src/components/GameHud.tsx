import { ArrowRight, LogOut, Minimize2, ScrollText, Volume2, VolumeX } from 'lucide-react';
import type { ObrMode } from '../hooks/useOwlbearRodeo';
import type { RoomSnapshot } from '../shared/types';

interface GameHudProps {
  snapshot: RoomSnapshot;
  isHost: boolean;
  isSpectator: boolean;
  muted: boolean;
  logOpen: boolean;
  obrMode?: ObrMode;
  onCloseObrModal?: () => void;
  onToggleLog: () => void;
  onToggleMute: () => void;
  onAdvancePhase: (target: 'INVESTIGATION_BOARD' | 'VERDICT') => void;
  onLeaveRoom: () => void;
}

const PHASE_LABELS: Record<RoomSnapshot['phase'], string> = {
  LOBBY: '1_Lobby · Persiapan',
  CRIME_SCENE: '2_CrimeScene · TKP Lab',
  INVESTIGATION_BOARD: '3_InvestigationBoard · Interogasi',
  VERDICT: '4_Verdict · Voting Akhir',
  RESULT: '4_Verdict · Hasil Kasus',
};

const MOBILE_PHASE_LABELS: Record<RoomSnapshot['phase'], string> = {
  LOBBY: 'Lobby',
  CRIME_SCENE: 'Fase TKP',
  INVESTIGATION_BOARD: 'Interogasi',
  VERDICT: 'Voting',
  RESULT: 'Hasil',
};

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function GameHud({
  snapshot,
  isHost,
  isSpectator,
  muted,
  logOpen,
  obrMode = 'standalone',
  onCloseObrModal,
  onToggleLog,
  onToggleMute,
  onAdvancePhase,
  onLeaveRoom,
}: GameHudProps) {
  const foundCount = snapshot.caseData.clues.filter((c) => c.found).length;
  const totalClues = snapshot.caseData.clues.length;
  const activeCount = snapshot.players.filter((p) => !p.isSpectator).length;
  const spectatorCount = snapshot.players.filter((p) => p.isSpectator).length;

  const timerTone =
    snapshot.timeRemaining <= 15
      ? 'text-red-400'
      : snapshot.timeRemaining <= 35
      ? 'text-amber-400'
      : 'text-slate-100';

  const hasHostAdvance =
    isHost && (snapshot.phase === 'CRIME_SCENE' || snapshot.phase === 'INVESTIGATION_BOARD');
  const activeCombo =
    snapshot.phase === 'CRIME_SCENE' &&
    snapshot.comboCount >= 2 &&
    snapshot.comboExpiresAt > Date.now()
      ? Math.min(5, snapshot.comboCount)
      : 1;

  return (
    <>
      {/* Mobile & Tablet (< lg): Compact sticky top bar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs font-semibold text-amber-300">
              {MOBILE_PHASE_LABELS[snapshot.phase]}
            </span>
            {isSpectator && (
              <span className="text-[11px] font-semibold text-sky-300 whitespace-nowrap shrink-0">
                · Penonton
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs tabular-nums shrink-0">
            {snapshot.phase !== 'RESULT' && (
              <>
                <span className={`font-bold ${timerTone}`}>
                  {formatClock(snapshot.timeRemaining)}
                </span>
                <span className="text-slate-700" aria-hidden="true">
                  ·
                </span>
              </>
            )}
            <span className="text-slate-200">
              {foundCount}/{totalClues}
            </span>
            <span className="text-slate-700" aria-hidden="true">
              ·
            </span>
            <span className="font-semibold text-amber-300">{snapshot.score}</span>
            {activeCombo > 1 && (
              <span className="font-bold text-emerald-400">x{activeCombo}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleLog}
              aria-pressed={logOpen}
              aria-label={`Buka log investigasi (${snapshot.investigationLogs.length})`}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors cursor-pointer ${
                logOpen
                  ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                  : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
              }`}
            >
              <ScrollText className="h-4 w-4 shrink-0" />
              <span className="font-mono text-[11px] tabular-nums">
                {snapshot.investigationLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition-colors hover:border-slate-500 cursor-pointer"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              aria-label="Keluar room"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-red-500/60 hover:text-red-300 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {obrMode === 'modal' && onCloseObrModal && (
              <button
                type="button"
                onClick={onCloseObrModal}
                aria-label="Kembali ke peta Owlbear"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-amber-400/60 hover:text-amber-300 cursor-pointer"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {hasHostAdvance && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 px-3 py-1.5">
            <span className="font-mono text-[11px] text-slate-400 tabular-nums truncate">
              Room {snapshot.roomCode} · {activeCount}/5 Detektif
              {spectatorCount > 0 ? ` · ${spectatorCount} Penonton` : ''}
            </span>
            {snapshot.phase === 'CRIME_SCENE' && (
              <button
                type="button"
                onClick={() => onAdvancePhase('INVESTIGATION_BOARD')}
                className="flex min-h-[40px] items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Papan Investigasi</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {snapshot.phase === 'INVESTIGATION_BOARD' && (
              <button
                type="button"
                onClick={() => onAdvancePhase('VERDICT')}
                className="flex min-h-[40px] items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Buka Voting Vonis</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Desktop (lg+): Floating workstation HUD */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 hidden flex-wrap items-center justify-between gap-3 px-4 py-3 lg:flex">
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-slate-700/90 bg-slate-900/95 px-3.5 py-2 shadow-lg">
          <span className="text-sm font-semibold text-amber-300 whitespace-nowrap shrink-0">
            {PHASE_LABELS[snapshot.phase]}
          </span>
          {isSpectator && (
            <>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-xs font-semibold text-sky-300 whitespace-nowrap shrink-0">
                Mode Penonton
              </span>
            </>
          )}
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap shrink-0">
            Room {snapshot.roomCode}
          </span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap shrink-0">
            {activeCount}/5 Detektif
            {spectatorCount > 0 ? ` · ${spectatorCount} Penonton` : ''}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-slate-700/90 bg-slate-900/95 px-4 py-2 shadow-lg">
          {snapshot.phase !== 'RESULT' && (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400">Waktu</span>
                <span className={`font-mono text-base font-bold tabular-nums ${timerTone}`}>
                  {formatClock(snapshot.timeRemaining)}
                </span>
              </div>
              <span className="text-slate-700" aria-hidden="true">
                |
              </span>
            </>
          )}

          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-slate-400">Bukti</span>
            <span className="font-mono text-sm font-semibold text-slate-100 tabular-nums">
              {foundCount}/{totalClues}
            </span>
          </div>

          <span className="text-slate-700" aria-hidden="true">
            |
          </span>

          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-slate-400">Skor</span>
            <span className="font-mono text-sm font-semibold text-amber-300 tabular-nums">
              {snapshot.score}
            </span>
            {activeCombo > 1 && (
              <span className="font-mono text-xs font-bold text-emerald-400 tabular-nums">
                Combo x{activeCombo}
              </span>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {isHost && snapshot.phase === 'CRIME_SCENE' && (
            <button
              type="button"
              onClick={() => onAdvancePhase('INVESTIGATION_BOARD')}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Papan Investigasi</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          {isHost && snapshot.phase === 'INVESTIGATION_BOARD' && (
            <button
              type="button"
              onClick={() => onAdvancePhase('VERDICT')}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/60 bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Buka Voting Vonis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleLog}
            aria-pressed={logOpen}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              logOpen
                ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                : 'border-slate-700 bg-slate-900/95 text-slate-200 hover:border-slate-500 hover:text-white'
            }`}
          >
            <ScrollText className="h-3.5 w-3.5" />
            <span>Log</span>
            <span className="font-mono text-[11px] tabular-nums opacity-85">
              ({snapshot.investigationLogs.length})
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/95 text-slate-200 transition-colors hover:border-slate-500 hover:text-white cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-red-500/60 hover:text-red-300 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>

          {obrMode === 'modal' && onCloseObrModal && (
            <button
              type="button"
              onClick={onCloseObrModal}
              title="Tutup panel & kembali ke peta Owlbear Rodeo"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/60 hover:text-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Peta VTT</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
}
