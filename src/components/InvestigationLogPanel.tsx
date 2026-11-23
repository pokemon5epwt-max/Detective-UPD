import { useEffect, useRef, useState } from 'react';
import { ScrollText, X } from 'lucide-react';
import type { InvestigationLogEntry, LogCategory } from '../shared/types';

interface InvestigationLogPanelProps {
  logs: InvestigationLogEntry[];
  open: boolean;
  onClose: () => void;
}

const CATEGORY_META: Record<LogCategory, { label: string; colorClass: string }> = {
  CLUE: { label: 'Bukti', colorClass: 'text-emerald-300' },
  PENALTY: { label: 'Penalti', colorClass: 'text-red-300' },
  INTERROGATION: { label: 'Interogasi', colorClass: 'text-amber-300' },
  VOTE: { label: 'Voting', colorClass: 'text-sky-300' },
  SYSTEM: { label: 'Sistem', colorClass: 'text-slate-400' },
};

function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString('id-ID', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function InvestigationLogPanel({ logs, open, onClose }: InvestigationLogPanelProps) {
  const [filter, setFilter] = useState<'ALL' | 'CLUE' | 'ACTIONS'>('ALL');
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const filteredLogs = logs.filter((entry) => {
    if (filter === 'CLUE') return entry.category === 'CLUE';
    if (filter === 'ACTIONS') return entry.category !== 'SYSTEM';
    return true;
  });

  useEffect(() => {
    if (open && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [filteredLogs.length, open]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
      />
      <aside
        aria-label="Log Investigasi"
        className="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col border-l border-slate-700/90 bg-slate-900/98 shadow-2xl lg:inset-y-auto lg:top-16 lg:right-3 lg:bottom-16 lg:z-20 lg:w-80 lg:rounded-xl lg:border lg:bg-slate-900/95"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3.5 py-2.5 lg:py-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-amber-300 shrink-0" />
            <h2 className="font-display text-sm font-bold text-slate-50">Log Investigasi</h2>
            <span className="font-mono text-xs text-slate-400 tabular-nums">({logs.length})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel log investigasi"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 lg:min-h-0 lg:min-w-0 lg:h-7 lg:w-7 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-b border-slate-800 px-3 py-2">
          {(
            [
              ['ALL', 'Semua'],
              ['CLUE', 'Bukti'],
              ['ACTIONS', 'Aksi Tim'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-[36px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 lg:min-h-0 cursor-pointer ${
                filter === key
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {filteredLogs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/50 p-4 text-center text-xs text-slate-500">
            Belum ada catatan pada filter ini.
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {filteredLogs.map((entry) => {
              const meta = CATEGORY_META[entry.category];
              return (
                <li
                  key={entry.id}
                  className="rounded-lg border border-slate-800/90 bg-slate-950/85 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={`font-semibold ${meta.colorClass}`}>{meta.label}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  {entry.actorName && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-100">
                      <span
                        style={{ backgroundColor: entry.actorColor || '#94A3B8' }}
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        aria-hidden="true"
                      />
                      <span>{entry.actorName}</span>
                    </div>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{entry.message}</p>
                </li>
              );
            })}
            <div ref={listEndRef} />
          </ol>
        )}
      </div>
      </aside>
    </>
  );
}
