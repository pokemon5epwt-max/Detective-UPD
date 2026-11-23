import { useState } from 'react';
import { Award, CheckCircle2, Fingerprint, RotateCcw, ShieldAlert, Vote } from 'lucide-react';
import { CASE_IMAGES } from '../assets/caseImages';
import type { RoomSnapshot } from '../shared/types';

interface VerdictViewProps {
  snapshot: RoomSnapshot;
  myPlayerId: string;
  isHost: boolean;
  isSpectator: boolean;
  logOpen: boolean;
  onCastVote: (culpritId: string, pokemonId: string) => void;
  onRestartLobby: () => void;
}

export function VerdictView({
  snapshot,
  myPlayerId,
  isHost,
  isSpectator,
  logOpen,
  onCastVote,
  onRestartLobby,
}: VerdictViewProps) {
  const [selectedCulprit, setSelectedCulprit] = useState<string>(
    snapshot.caseData.suspects[0].suspectID
  );
  const [selectedPokemon, setSelectedPokemon] = useState<string>(
    snapshot.caseData.pokemonOptions[0].pokemonId
  );
  const [brokenPortraits, setBrokenPortraits] = useState<Record<string, boolean>>({});

  const activePlayers = snapshot.players.filter((p) => !p.isSpectator);
  const hasVoted = snapshot.votedPlayerIds.includes(myPlayerId);
  const suspectMap = Object.fromEntries(
    snapshot.caseData.suspects.map((s) => [s.suspectID, s.name])
  );
  const pokemonMap = Object.fromEntries(
    snapshot.caseData.pokemonOptions.map((p) => [p.pokemonId, p.name])
  );

  if (snapshot.phase === 'RESULT' && snapshot.verdictSummary) {
    const summary = snapshot.verdictSummary;
    return (
      <main
        className={`min-h-screen w-full bg-slate-950 px-3 pt-4 pb-10 sm:px-6 lg:pt-20 transition-[padding] duration-150 ${
          logOpen ? 'lg:pr-[21.5rem]' : ''
        }`}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-xl border border-slate-800 bg-slate-900/95 p-4 sm:p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              {summary.isTeamCorrect ? (
                <Award className="h-8 w-8 text-amber-400 shrink-0" />
              ) : (
                <ShieldAlert className="h-8 w-8 text-red-400 shrink-0" />
              )}
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-50">
                  {summary.isTeamCorrect
                    ? 'Kasus Terpecahkan!'
                    : 'Vonis Tim Belum Tepat'}
                </h2>
                <p className="text-xs text-slate-400">
                  Skor Akhir Tim:{' '}
                  <span className="font-mono font-bold text-amber-300 tabular-nums">
                    {snapshot.score}
                  </span>
                </p>
              </div>
            </div>

            {isHost ? (
              <button
                type="button"
                onClick={onRestartLobby}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-400 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Main Lagi (Kembali ke Lobby)</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                Menunggu Host membuka room kembali...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950/90 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-slate-400">Keputusan Mayoritas Tim</p>
                <span
                  className={`-rotate-6 rounded border-2 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider ${
                    summary.culpritCorrect
                      ? 'border-emerald-400 bg-emerald-950/40 text-emerald-300'
                      : 'border-red-500 bg-red-950/40 text-red-400'
                  }`}
                >
                  {summary.culpritCorrect ? 'DITANGKAP' : 'SALAH TANGKAP'}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-100">
                Pelaku:{' '}
                <span className={summary.culpritCorrect ? 'text-emerald-400' : 'text-red-400'}>
                  {suspectMap[summary.winningCulpritId] || 'Tidak ada suara'}
                </span>
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Pokémon:{' '}
                <span className={summary.pokemonCorrect ? 'text-emerald-400' : 'text-red-400'}>
                  {pokemonMap[summary.winningPokemonId] || 'Tidak ada suara'}
                </span>
              </p>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-amber-500/40 bg-slate-950/90 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-amber-300">Kebenaran Kasus</p>
                <span className="-rotate-6 rounded border-2 border-red-500 bg-red-950/40 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-red-300">
                  TERBUKTI
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-slate-100">
                Pelaku Sebenarnya: {suspectMap[summary.solutionCulpritId]}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Pokémon Terlibat: {pokemonMap[summary.solutionPokemonId]}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
            <h3 className="text-xs font-semibold text-amber-300">Rekonstruksi Kejadian</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
              {summary.solutionExplanation}
            </p>
          </div>

          <div>
            <h3 className="mb-2.5 text-xs font-semibold text-slate-300">
              Rincian Suara Detektif ({summary.playerVotes.length})
            </h3>
            {summary.playerVotes.length === 0 ? (
              <p className="text-xs text-slate-500">Waktu habis sebelum ada suara masuk.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {summary.playerVotes.map((pv) => (
                  <div
                    key={pv.playerId}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: pv.playerColor }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-slate-100">{pv.playerName}</span>
                    </div>
                    <span className="text-slate-300">
                      {suspectMap[pv.culpritId]} · {pokemonMap[pv.pokemonId]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen w-full bg-slate-950 px-3 pt-4 pb-10 sm:px-6 lg:pt-20 transition-[padding] duration-150 ${
        logOpen ? 'lg:pr-[21.5rem]' : ''
      }`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-xl border border-slate-800 bg-slate-900/95 p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-50">
              4_Verdict · Sidang Penentuan Pelaku
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Pilih pelaku utama dan Pokémon pendamping. Keputusan akhir diambil berdasarkan suara
              mayoritas tim.
            </p>
          </div>
          <div className="font-mono text-xs text-amber-300 tabular-nums">
            {snapshot.votedPlayerIds.length}/{activePlayers.length} Detektif Memilih
          </div>
        </div>

        {/* Killer Profile Reference Strip for Final Deduction */}
        <section
          aria-label="Profil Pelaku Terungkap"
          className="rounded-lg border border-red-500/35 bg-slate-950/85 p-3.5"
        >
          <div className="flex items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-red-400 shrink-0" />
              <h3 className="text-xs font-semibold text-red-200">
                Profil Pelaku Terungkap ({snapshot.unlockedTraitIds.length}/
                {snapshot.caseData.killerTraits.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Cocokkan dengan berkas tersangka</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {snapshot.caseData.killerTraits.map((trait, idx) => {
              const unlocked = snapshot.unlockedTraitIds.includes(trait.traitId);
              return (
                <div
                  key={trait.traitId}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                    unlocked
                      ? 'border-red-500/40 bg-red-950/25 text-red-100'
                      : 'border-dashed border-slate-800 bg-slate-900/40 text-slate-500'
                  }`}
                >
                  <CheckCircle2
                    className={`h-3.5 w-3.5 shrink-0 ${
                      unlocked ? 'text-red-400' : 'text-slate-700'
                    }`}
                  />
                  <span>
                    {unlocked ? trait.label : `Ciri #${idx + 1} belum terungkap`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">
            1. Tentukan Tersangka Utama (Berkas Pelaku)
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {snapshot.caseData.suspects.map((suspect, idx) => {
              const active = selectedCulprit === suspect.suspectID;
              const imgUrl = CASE_IMAGES.suspects[suspect.suspectID];
              const isBroken = brokenPortraits[suspect.suspectID];
              return (
                <button
                  key={suspect.suspectID}
                  type="button"
                  disabled={hasVoted || isSpectator}
                  onClick={() => setSelectedCulprit(suspect.suspectID)}
                  className={`flex flex-col overflow-hidden rounded-lg border text-left transition-all ${
                    active
                      ? 'border-amber-400 bg-slate-800 shadow-lg'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-600'
                  } ${hasVoted || isSpectator ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-2.5 py-1 font-mono text-[10px] text-slate-400">
                    <span>BERKAS #{String(idx + 1).padStart(2, '0')}</span>
                    {active && <span className="font-bold text-amber-300">TERPILIH</span>}
                  </div>
                  <div className="aspect-square w-full overflow-hidden bg-slate-800">
                    {imgUrl && !isBroken ? (
                      <img
                        src={imgUrl}
                        alt={suspect.name}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenPortraits((prev) => ({ ...prev, [suspect.suspectID]: true }))
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-amber-300">
                        {suspect.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <p className="text-sm font-semibold text-slate-100">{suspect.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{suspect.role}</p>
                    <ul className="mt-2 flex flex-col gap-1 border-t border-slate-800/80 pt-2">
                      {suspect.traits.map((trait) => (
                        <li
                          key={trait}
                          className="text-[11px] leading-snug text-slate-300"
                        >
                          · {trait}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">
            2. Tentukan Pokémon yang Terlibat
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {snapshot.caseData.pokemonOptions.map((pk) => {
              const active = selectedPokemon === pk.pokemonId;
              return (
                <button
                  key={pk.pokemonId}
                  type="button"
                  disabled={hasVoted || isSpectator}
                  onClick={() => setSelectedPokemon(pk.pokemonId)}
                  className={`rounded-lg border p-3.5 text-left transition-all ${
                    active
                      ? 'border-red-400 bg-slate-800 shadow-lg'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-600'
                  } ${hasVoted || isSpectator ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">{pk.name}</span>
                    <span className="text-[11px] text-amber-300">{pk.elementType}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{pk.traitHint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-400">
            {isSpectator ? (
              <span>Mode Penonton · Anda tidak ikut memberikan suara vonis.</span>
            ) : (
              <>
                Pilihan Anda:{' '}
                <span className="font-semibold text-slate-100">
                  {suspectMap[selectedCulprit]} · {pokemonMap[selectedPokemon]}
                </span>
              </>
            )}
          </div>

          {isSpectator ? (
            <div className="rounded-lg border border-sky-500/40 bg-sky-950/30 px-4 py-2.5 text-xs font-medium text-sky-200">
              Menunggu para detektif menyelesaikan voting...
            </div>
          ) : hasVoted ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>Suara Anda sudah dicatat — menunggu detektif lain...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onCastVote(selectedCulprit, selectedPokemon)}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 cursor-pointer"
            >
              <Vote className="h-4 w-4" />
              <span>Tangkap &amp; Kirim Vonis</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
