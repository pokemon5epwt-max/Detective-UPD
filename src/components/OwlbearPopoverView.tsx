import { useState } from 'react';
import { ExternalLink, LogIn, Maximize2, Play, RotateCcw } from 'lucide-react';
import { HOENN_CASE_DATA } from '../shared/caseData';

interface OwlbearPopoverViewProps {
  obrReady: boolean;
  obrPlayerName: string | null;
  obrRole: 'GM' | 'PLAYER' | null;
  syncedRoomCode: string | null;
  syncedHostName: string | null;
  onOpenModal: (action?: 'create' | 'join', roomCode?: string) => void;
  onClearRoom: () => void;
}

export function OwlbearPopoverView({
  obrReady,
  obrPlayerName,
  obrRole,
  syncedRoomCode,
  syncedHostName,
  onOpenModal,
  onClearRoom,
}: OwlbearPopoverViewProps) {
  const [manualCode, setManualCode] = useState('');

  return (
    <main className="flex min-h-screen w-full flex-col justify-between bg-slate-950 p-4 text-slate-100">
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/owlbear-icon.svg"
              alt="Hoenn Detective Agency"
              className="h-8 w-8 shrink-0 rounded-md"
            />
            <div className="min-w-0">
              <h1 className="font-display truncate text-base font-bold text-slate-50">
                Hoenn Detective Agency
              </h1>
              <p className="truncate text-[11px] text-slate-400">
                {obrReady ? (
                  <>
                    <span>{obrPlayerName || 'Detektif'}</span>
                    <span className="mx-1.5 text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-amber-300">
                      {obrRole === 'GM' ? 'Game Master' : 'Pemain'}
                    </span>
                  </>
                ) : (
                  'Menghubungkan ke Owlbear Rodeo...'
                )}
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-slate-800 bg-slate-900/90 p-3.5">
          <p className="text-[11px] font-semibold text-amber-300">
            Kasus Aktif · {HOENN_CASE_DATA.location}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{HOENN_CASE_DATA.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            {HOENN_CASE_DATA.clues.length} bukti TKP · {HOENN_CASE_DATA.suspects.length} saksi ·
            Co-op 1–5 detektif
          </p>
        </section>

        {syncedRoomCode ? (
          <section className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-slate-900/95 p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-slate-400">
                  Room Tersinkron di Meja Ini
                </p>
                <p className="mt-0.5 font-mono text-xl font-bold tracking-widest text-amber-300 tabular-nums">
                  {syncedRoomCode}
                </p>
              </div>
              {syncedHostName && (
                <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  Host: {syncedHostName}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!obrReady}
              onClick={() => onOpenModal('join', syncedRoomCode)}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Gabung &amp; Buka Layar Penuh</span>
            </button>

            <button
              type="button"
              onClick={onClearRoom}
              className="flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Putuskan Tautan Room</span>
            </button>
          </section>
        ) : (
          <section className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={!obrReady}
              onClick={() => onOpenModal('create')}
              className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Buat Room &amp; Buka Layar Penuh</span>
            </button>

            <button
              type="button"
              disabled={!obrReady}
              onClick={() => onOpenModal()}
              className="flex min-h-[38px] w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/60 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Buka Lobi Manual (Layar Penuh)</span>
            </button>

            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualCode.trim().length >= 4 && obrReady) {
                    onOpenModal('join', manualCode.trim());
                  }
                }}
                placeholder="KODE ROOM"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs tracking-widest text-slate-100 uppercase outline-none focus:border-amber-400"
              />
              <button
                type="button"
                disabled={!obrReady || manualCode.trim().length < 4}
                onClick={() => onOpenModal('join', manualCode.trim())}
                className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 transition-colors hover:border-amber-400 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Gabung</span>
              </button>
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-slate-800/90 pt-3 text-[11px] leading-relaxed text-slate-500">
        Saat Host membuat room, kode akan otomatis dibagikan ke seluruh pemain di meja Owlbear Rodeo ini.
      </footer>
    </main>
  );
}
