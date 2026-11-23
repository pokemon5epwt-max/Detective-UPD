import { useState } from 'react';
import { CheckCircle2, FileCheck2, Fingerprint, Lock, MessageSquare } from 'lucide-react';
import { CASE_IMAGES } from '../assets/caseImages';
import type { ClueType, RoomSnapshot } from '../shared/types';

interface InvestigationBoardViewProps {
  snapshot: RoomSnapshot;
  isSpectator: boolean;
  logOpen: boolean;
  onSelectSuspect: (suspectId: string) => void;
  onChooseDialogue: (choiceId: string) => void;
}

const CLUE_TYPE_LABELS: Record<ClueType, string> = {
  PHYSICAL: 'Bukti Fisik',
  DOCUMENT: 'Dokumen',
  RESIDUE: 'Residu',
  OBJECT: 'Benda',
  POKEMON_TRACE: 'Jejak Pokémon',
};

export function InvestigationBoardView({
  snapshot,
  isSpectator,
  logOpen,
  onSelectSuspect,
  onChooseDialogue,
}: InvestigationBoardViewProps) {
  const [filterType, setFilterType] = useState<'ALL' | ClueType>('ALL');
  const [brokenPortraits, setBrokenPortraits] = useState<Record<string, boolean>>({});

  const foundClues = snapshot.caseData.clues.filter((c) => c.found);
  const foundClueSet = new Set(foundClues.map((c) => c.clueID));
  const filteredClues =
    filterType === 'ALL' ? foundClues : foundClues.filter((c) => c.type === filterType);

  const suspectNameMap = Object.fromEntries(
    snapshot.caseData.suspects.map((s) => [s.suspectID, s.name])
  );
  const sceneNameMap = Object.fromEntries(
    snapshot.caseData.scenes.map((sc) => [sc.sceneId, sc.title])
  );

  const activeSuspect =
    snapshot.caseData.suspects.find((s) => s.suspectID === snapshot.activeDialogue.suspectId) ||
    snapshot.caseData.suspects[0];
  const currentNode =
    snapshot.caseData.dialogueNodes[snapshot.activeDialogue.currentNodeId] ||
    snapshot.caseData.dialogueNodes[activeSuspect.startNodeId];
  const unlockedTraitSet = new Set(snapshot.unlockedTraitIds);

  const hasAlibiContradiction = (suspectId: string) => {
    if (suspectId === 'kaya') {
      return snapshot.activeDialogue.unlockedHints.some(
        (h) =>
          h.includes('Kaya terpojok') ||
          h.includes('Tang berisolasi milik Kaya') ||
          h.includes('pemotong kaca berlian')
      );
    }
    return false;
  };

  return (
    <main
      className={`min-h-screen w-full bg-slate-950 px-3 pt-4 pb-8 sm:px-6 lg:pt-20 transition-[padding] duration-150 ${
        logOpen ? 'lg:pr-[21.5rem]' : ''
      }`}
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
        {/* Left Column: Killer Profile + Evidence Corkboard + Unlocked Interrogation Hints */}
        <section className="flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-900/90 p-4 sm:p-5 lg:col-span-5">
          {/* Criminal Case Killer Profile Panel */}
          <div className="rounded-lg border border-red-500/35 bg-slate-950/90 p-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-red-400 shrink-0" />
                <h2 className="font-display text-sm font-bold text-slate-50">
                  Profil Pelaku (Killer Profile)
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-red-300 tabular-nums">
                {snapshot.unlockedTraitIds.length}/{snapshot.caseData.killerTraits.length}
              </span>
            </div>
            <ul className="mt-2.5 flex flex-col gap-1.5">
              {snapshot.caseData.killerTraits.map((trait, idx) => {
                const unlocked = unlockedTraitSet.has(trait.traitId);
                return (
                  <li
                    key={trait.traitId}
                    className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                      unlocked
                        ? 'border-red-500/40 bg-red-950/25 text-red-100'
                        : 'border-dashed border-slate-800 bg-slate-900/40 text-slate-500'
                    }`}
                  >
                    <CheckCircle2
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        unlocked ? 'text-red-400' : 'text-slate-700'
                      }`}
                    />
                    <span>
                      {unlocked
                        ? trait.label
                        : `Ciri #${idx + 1} — Belum terungkap (cari bukti / interogasi)`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-50">
                Papan Bukti TKP
              </h2>
              <p className="text-xs text-slate-400">
                {foundClues.length} dari {snapshot.caseData.clues.length} bukti terkumpul
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-950 p-1">
            {(
              [
                ['ALL', 'Semua'],
                ['PHYSICAL', 'Fisik'],
                ['DOCUMENT', 'Dokumen'],
                ['OBJECT', 'Benda'],
                ['RESIDUE', 'Residu'],
                ['POKEMON_TRACE', 'Pokémon'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterType(key)}
                className={`min-h-[38px] rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 lg:min-h-0 cursor-pointer ${
                  filterType === key
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredClues.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-400">
              {foundClues.length === 0
                ? 'Belum ada bukti ditemukan dari TKP. Gunakan kesaksian awal untuk menelusuri alibi.'
                : 'Tidak ada bukti pada kategori filter ini.'}
            </div>
          ) : (
            <div className="flex max-h-[360px] flex-col gap-3 overflow-y-auto pr-1">
              {filteredClues.map((clue) => (
                <article
                  key={clue.clueID}
                  className="rounded-lg border border-slate-800 bg-slate-950/90 p-3.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold text-amber-200">{clue.name}</h3>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                      {CLUE_TYPE_LABELS[clue.type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {sceneNameMap[clue.scene] || clue.scene}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    {clue.description}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Terkait:{' '}
                    <span className="text-slate-200">
                      {clue.linkedSuspectIDs.map((id) => suspectNameMap[id] || id).join(' · ')}
                    </span>
                  </p>
                </article>
              ))}
            </div>
          )}

          <div className="border-t border-slate-800 pt-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Fakta Interogasi Terbuka ({snapshot.activeDialogue.unlockedHints.length})</span>
            </h3>
            {snapshot.activeDialogue.unlockedHints.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Ajukan pertanyaan berbasis bukti kepada saksi untuk membuka kesimpulan baru.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {snapshot.activeDialogue.unlockedHints.map((hint, idx) => (
                  <li
                    key={`${idx}_${hint}`}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs leading-relaxed text-emerald-200"
                  >
                    {hint}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Right Column: Suspect Selector + Synchronized Branching Dialogue */}
        <section className="flex flex-col gap-5 rounded-xl border border-slate-800 bg-slate-900/90 p-5 lg:col-span-7">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="font-display text-xl font-bold text-slate-50">
              Interogasi Saksi &amp; Tersangka
            </h2>
            <p className="text-xs text-slate-400">
              {isSpectator
                ? 'Mode Penonton — Anda mengikuti jalannya interogasi tim secara langsung.'
                : 'Pilihan saksi dan dialog tersinkronisasi real-time untuk seluruh tim detektif.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {snapshot.caseData.suspects.map((suspect, idx) => {
              const isSelected = suspect.suspectID === activeSuspect.suspectID;
              const imgUrl = CASE_IMAGES.suspects[suspect.suspectID];
              const isBroken = brokenPortraits[suspect.suspectID];
              const alibiCracked = hasAlibiContradiction(suspect.suspectID);

              return (
                <button
                  key={suspect.suspectID}
                  type="button"
                  disabled={isSpectator}
                  onClick={() => onSelectSuspect(suspect.suspectID)}
                  className={`flex flex-col overflow-hidden rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-slate-800 shadow-lg'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-600'
                  } ${isSpectator ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-2.5 py-1 font-mono text-[10px] text-slate-400">
                    <span>BERKAS #{String(idx + 1).padStart(2, '0')}</span>
                    {alibiCracked && (
                      <span className="font-bold text-red-400">TERBANTAH</span>
                    )}
                  </div>
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                    {imgUrl && !isBroken ? (
                      <img
                        src={imgUrl}
                        alt={suspect.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenPortraits((prev) => ({
                            ...prev,
                            [suspect.suspectID]: true,
                          }))
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-800 font-display text-2xl font-bold text-amber-300">
                        {suspect.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {alibiCracked && (
                      <div className="pointer-events-none absolute right-1.5 bottom-1.5 -rotate-6 rounded border-2 border-red-500 bg-slate-950/85 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-red-400 shadow">
                        ALIBI GOYAH
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs font-semibold text-slate-100">{suspect.name}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      Partner: {suspect.pokemonPartnerName}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Suspect Profile & Dialogue Box */}
          <div className="flex flex-1 flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/90 p-4 sm:p-5">
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <h3 className="text-base font-bold text-amber-300">{activeSuspect.name}</h3>
                  <p className="text-xs text-slate-400">
                    {activeSuspect.role} · {activeSuspect.affiliation} · Partner:{' '}
                    {activeSuspect.pokemonPartnerName}
                  </p>
                </div>
                {hasAlibiContradiction(activeSuspect.suspectID) && (
                  <span className="-rotate-2 rounded border-2 border-red-500/90 bg-red-950/40 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-red-300">
                    ALIBI TERBANTAHKAN
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Alibi Awal: <span className="text-slate-300">{activeSuspect.alibiSummary}</span>
              </p>

              <div className="mt-3 grid grid-cols-1 gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/60 p-3 sm:grid-cols-2">
                {activeSuspect.traits.map((trait) => (
                  <div key={trait} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                    <span className="mt-1 h-1.5 w-1.5 rounded-xs bg-amber-400/80 shrink-0" />
                    <span>{trait}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>{currentNode.speaker}</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-100">{currentNode.text}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-400">Pilih Pertanyaan / Tanggapan:</p>
              {currentNode.choices.map((choice) => {
                const locked = Boolean(
                  choice.requiredClueId && !foundClueSet.has(choice.requiredClueId)
                );
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={locked || isSpectator}
                    onClick={() => onChooseDialogue(choice.id)}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left text-xs font-medium transition-colors ${
                      locked
                        ? 'cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-500'
                        : isSpectator
                        ? 'cursor-default border-slate-800 bg-slate-900/70 text-slate-300'
                        : 'cursor-pointer border-slate-700 bg-slate-900 text-slate-100 hover:border-amber-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{choice.label}</span>
                    {locked && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                        <Lock className="h-3 w-3" />
                        <span>Bukti belum ditemukan</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
