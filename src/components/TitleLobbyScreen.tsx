import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  LogOut,
  Play,
  Puzzle,
  RefreshCw,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CASE_IMAGES } from '../assets/caseImages';
import type { TransportStatus } from '../hooks/useDetectiveSocket';
import type { ObrMode } from '../hooks/useOwlbearRodeo';
import { HOENN_CASE_DATA } from '../shared/caseData';
import type { RoomSnapshot } from '../shared/types';

interface TitleLobbyScreenProps {
  connected: boolean;
  transportStatus?: TransportStatus;
  connectionHint?: string | null;
  onRetryConnection?: () => void;
  playerId: string | null;
  snapshot: RoomSnapshot | null;
  errorMsg: string | null;
  muted: boolean;
  obrMode?: ObrMode;
  obrPlayerName?: string | null;
  syncedRoomCode?: string | null;
  onCloseObrModal?: () => void;
  onToggleMute: () => void;
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function TitleLobbyScreen({
  connected,
  transportStatus = connected ? 'ws' : 'connecting',
  connectionHint = null,
  onRetryConnection,
  playerId,
  snapshot,
  errorMsg,
  muted,
  obrMode = 'standalone',
  obrPlayerName = null,
  syncedRoomCode = null,
  onCloseObrModal,
  onToggleMute,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
}: TitleLobbyScreenProps) {
  const [playerName, setPlayerName] = useState('Detektif Brendan');
  const [nameEdited, setNameEdited] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [manifestCopied, setManifestCopied] = useState(false);
  const [showOwlbearHelp, setShowOwlbearHelp] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (obrPlayerName && !nameEdited) {
      setPlayerName(obrPlayerName.slice(0, 20));
    }
  }, [obrPlayerName, nameEdited]);

  useEffect(() => {
    if (syncedRoomCode && !roomCodeInput) {
      setRoomCodeInput(syncedRoomCode);
    }
  }, [syncedRoomCode, roomCodeInput]);

  const manifestUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/manifest.json` : '/manifest.json';

  const handleCopyManifest = async () => {
    try {
      await navigator.clipboard.writeText(manifestUrl);
      setManifestCopied(true);
      setTimeout(() => setManifestCopied(false), 1800);
    } catch {
      setManifestCopied(false);
    }
  };

  const isHost = Boolean(snapshot && playerId && snapshot.hostId === playerId);
  const activePlayers = snapshot ? snapshot.players.filter((p) => !p.isSpectator) : [];
  const spectators = snapshot ? snapshot.players.filter((p) => p.isSpectator) : [];

  const handleCopyCode = async () => {
    if (!snapshot) return;
    try {
      await navigator.clipboard.writeText(snapshot.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-slate-950 px-6 py-8">
      {!imgFailed ? (
        <img
          src={CASE_IMAGES.lobbyBackdrop}
          alt="Kantor Agensi Detektif Pesisir Hoenn"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/30" />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/70" />

      <div className="fixed right-5 top-5 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 transition-colors hover:border-amber-400/60 hover:text-amber-300 cursor-pointer"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {obrMode === 'modal' && onCloseObrModal && (
          <button
            type="button"
            onClick={onCloseObrModal}
            className="flex h-10 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-3 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400/60 hover:text-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span>Kembali ke Peta</span>
          </button>
        )}
      </div>

      <div className="relative z-10 grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-12">
        <section className="flex flex-col gap-5 lg:col-span-6">
          <div className="flex items-center gap-3">
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect
                x="2"
                y="2"
                width="40"
                height="40"
                rx="10"
                fill="#1E293B"
                stroke="#F59E0B"
                strokeWidth="2"
              />
              <circle cx="20" cy="20" r="9" stroke="#F8FAFC" strokeWidth="2.4" />
              <path d="M12.5 20H27.5" stroke="#F59E0B" strokeWidth="2" />
              <circle cx="20" cy="20" r="2.6" fill="#DC2626" stroke="#F8FAFC" strokeWidth="1.2" />
              <path d="M26.8 26.8L33.5 33.5" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="text-xs font-medium tracking-wide text-amber-300">
              <span>Biro Investigasi Pesisir</span>
              <span className="mx-2 text-slate-500">·</span>
              <span>Co-op 1–5 Detektif</span>
            </div>
          </div>

          <h1 className="font-display max-w-xl text-4xl leading-tight font-bold text-slate-50 sm:text-5xl text-balance">
            Hoenn Detective Agency
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-slate-300">
            Sisir TKP laboratorium pesisir secara real-time bersama tim Anda, interogasi saksi
            lewat dialog bercabang, dan pecahkan sabotase sebelum waktu habis.
          </p>

          <div className="border-t border-slate-800/90 pt-4 text-xs text-slate-400">
            <span>Klik TKP untuk cari bukti</span>
            <span className="mx-2 text-slate-600">·</span>
            <span>Hindari salah klik (-10 detik)</span>
            <span className="mx-2 text-slate-600">·</span>
            <span>Voting pelaku &amp; Pokémon</span>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/90 bg-slate-900/95 p-6 shadow-2xl lg:col-span-6">
          {errorMsg && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-500/50 bg-red-950/60 px-4 py-3 text-sm text-red-200"
            >
              {errorMsg}
            </div>
          )}

          {!snapshot ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-50">
                  Masuk ke Ruang Kasus
                </h2>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
                  <p>
                    Status koneksi:{' '}
                    <span
                      className={
                        connected
                          ? 'text-emerald-400'
                          : transportStatus === 'error'
                          ? 'text-red-400'
                          : 'text-amber-300'
                      }
                    >
                      {connected
                        ? transportStatus === 'http'
                          ? 'Terhubung (Mode Kompatibel)'
                          : 'Terhubung ke server'
                        : transportStatus === 'error'
                        ? 'Gagal terhubung'
                        : 'Menghubungkan...'}
                    </span>
                  </p>

                  {!connected && onRetryConnection && (
                    <button
                      type="button"
                      onClick={onRetryConnection}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-amber-400 hover:text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Hubungkan Ulang</span>
                    </button>
                  )}
                </div>

                {connectionHint && !connected && (
                  <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-950/35 px-3 py-2 text-xs leading-relaxed text-amber-200">
                    {connectionHint}
                  </p>
                )}
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-300">Nama Detektif</span>
                <input
                  type="text"
                  maxLength={20}
                  value={playerName}
                  onChange={(e) => {
                    setNameEdited(true);
                    setPlayerName(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !roomCodeInput.trim()) {
                      onCreateRoom(playerName);
                    }
                  }}
                  placeholder="Masukkan nama Anda"
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-amber-400"
                />
              </label>

              <button
                type="button"
                disabled={!connected}
                onClick={() => onCreateRoom(playerName)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Play className="h-4 w-4" />
                <span>Buat Room Baru (Host)</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-800" />
                <span className="text-xs text-slate-500">atau gabung tim</span>
                <div className="h-px flex-1 bg-slate-800" />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && roomCodeInput.trim().length >= 4) {
                      onJoinRoom(roomCodeInput, playerName);
                    }
                  }}
                  placeholder="KODE ROOM"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm tracking-widest text-slate-100 uppercase outline-none transition-colors focus:border-amber-400"
                />
                <button
                  type="button"
                  disabled={!connected || roomCodeInput.trim().length < 4}
                  onClick={() => onJoinRoom(roomCodeInput, playerName)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-amber-400 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Gabung Room
                </button>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-semibold text-amber-300">
                  Kasus Aktif · {HOENN_CASE_DATA.location}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {HOENN_CASE_DATA.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {HOENN_CASE_DATA.clues.length} bukti tersembunyi ·{' '}
                  {HOENN_CASE_DATA.suspects.length} saksi untuk diinterogasi · Pemain yang
                  terlambat bergabung otomatis masuk sebagai penonton.
                </p>
              </div>

              {obrMode === 'standalone' && (
                <div className="border-t border-slate-800/80 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowOwlbearHelp((prev) => !prev)}
                    aria-expanded={showOwlbearHelp}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3.5 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:border-amber-500/50 hover:text-amber-200 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Puzzle className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                      <span>Import ke Owlbear Rodeo</span>
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {showOwlbearHelp ? 'Tutup' : 'Lihat URL Manifest'}
                    </span>
                  </button>

                  {showOwlbearHelp && (
                    <div className="mt-2.5 flex flex-col gap-2.5 rounded-lg border border-slate-800 bg-slate-950/90 p-3.5 text-xs">
                      <p className="text-slate-300">
                        Salin URL manifest di bawah ini, lalu buka{' '}
                        <span className="font-semibold text-slate-100">
                          Owlbear Rodeo → Extensions → Add Extension → Custom
                        </span>{' '}
                        dan tempel URL-nya.
                      </p>

                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-amber-300">
                          {manifestUrl}
                        </code>
                        <button
                          type="button"
                          onClick={handleCopyManifest}
                          className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:border-amber-400 hover:text-amber-200 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {manifestCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>

                      {typeof window !== 'undefined' &&
                        window.location.hostname.includes('ais-dev-') && (
                          <p className="text-[11px] leading-relaxed text-amber-300/90">
                            Catatan: URL preview dev membutuhkan login Google. Agar stabil di dalam
                            Owlbear Rodeo, gunakan URL publik hasil Share / Deploy (mis. Fly.io atau
                            App URL yang sudah dipublikasikan).
                          </p>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <p className="text-xs text-slate-400">1_Lobby · Kode Room</p>
                  <div className="mt-0.5 flex items-center gap-2.5">
                    <span className="font-mono text-2xl font-bold tracking-widest text-amber-300 tabular-nums">
                      {snapshot.roomCode}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:border-slate-500 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-red-500/60 hover:text-red-300 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar Room</span>
                </button>
              </div>

              <div>
                <div className="mb-2.5 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    <Users className="h-3.5 w-3.5 text-amber-300" />
                    <span>Daftar Detektif ({activePlayers.length}/5)</span>
                  </span>
                  <span>Late join masuk sebagai Penonton</span>
                </div>

                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const player = activePlayers[idx];
                    if (!player) {
                      return (
                        <div
                          key={`empty_${idx}`}
                          className="flex items-center justify-between rounded-lg border border-dashed border-slate-800 bg-slate-950/40 px-3.5 py-2.5 text-xs text-slate-500"
                        >
                          <span>Slot {idx + 1} · Menunggu detektif bergabung</span>
                          <span className="font-mono">Kosong</span>
                        </div>
                      );
                    }
                    const isMe = player.id === playerId;
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/85 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-sm shrink-0"
                            style={{ backgroundColor: player.color }}
                            aria-hidden="true"
                          />
                          <span className="text-sm font-medium text-slate-100">
                            {player.name}
                            {isMe ? ' (Anda)' : ''}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {player.isHost ? 'Host · Player 1' : `Client · Player ${idx + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {spectators.length > 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    Penonton ({spectators.length}):{' '}
                    <span className="text-slate-300">
                      {spectators.map((s) => s.name).join(' · ')}
                    </span>
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 text-xs leading-relaxed text-slate-300">
                <span className="font-semibold text-amber-300">{snapshot.caseData.title}:</span>{' '}
                {snapshot.caseData.briefing}
              </div>

              {isHost ? (
                <button
                  type="button"
                  onClick={onStartGame}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 cursor-pointer"
                >
                  <Play className="h-4 w-4" />
                  <span>Mulai Investigasi</span>
                </button>
              ) : (
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-3 text-center text-sm text-slate-300">
                  Menunggu Host memulai investigasi...
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
