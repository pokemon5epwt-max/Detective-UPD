import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { CheckCircle2, MapPin, Search, X } from 'lucide-react';
import { CASE_IMAGES } from '../assets/caseImages';
import type { SceneFeedbackMarker } from '../hooks/useDetectiveSocket';
import type { RoomSnapshot } from '../shared/types';

interface CrimeSceneViewProps {
  snapshot: RoomSnapshot;
  myPlayerId: string;
  isSpectator: boolean;
  logOpen: boolean;
  remoteCursors: Record<string, { sceneId: string; x: number; y: number }>;
  feedbackMarkers: SceneFeedbackMarker[];
  onSelectScene: (sceneId: string) => void;
  onCursorMove: (x: number, y: number) => void;
  onClueClick: (sceneId: string, clueId: string | null, x: number, y: number) => void;
}

export function CrimeSceneView({
  snapshot,
  myPlayerId,
  isSpectator,
  logOpen,
  remoteCursors,
  feedbackMarkers,
  onSelectScene,
  onCursorMove,
  onClueClick,
}: CrimeSceneViewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const [brokenScenes, setBrokenScenes] = useState<Record<string, boolean>>({});
  const [spectatorSceneId, setSpectatorSceneId] = useState<string>(
    snapshot.caseData.scenes[0].sceneId
  );
  const [selectedFoundClueId, setSelectedFoundClueId] = useState<string | null>(null);
  const [clueListScope, setClueListScope] = useState<'SCENE' | 'ALL'>('SCENE');

  const myPlayer = snapshot.players.find((p) => p.id === myPlayerId);
  const activeSceneId = isSpectator
    ? spectatorSceneId
    : myPlayer?.currentSceneId || snapshot.caseData.scenes[0].sceneId;

  const activeSceneInfo =
    snapshot.caseData.scenes.find((s) => s.sceneId === activeSceneId) ||
    snapshot.caseData.scenes[0];

  const allClues = snapshot.caseData.clues;
  const sceneClues = allClues.filter((c) => c.scene === activeSceneId);
  const totalFoundClues = allClues.filter((c) => c.found);
  const scopedFoundClues =
    clueListScope === 'SCENE'
      ? totalFoundClues.filter((c) => c.scene === activeSceneId)
      : totalFoundClues;

  const latestFoundClue =
    totalFoundClues.length > 0 ? totalFoundClues[totalFoundClues.length - 1] : null;
  const selectedFoundClue =
    totalFoundClues.find((c) => c.clueID === selectedFoundClueId) || null;
  const inspectedClue = selectedFoundClue || latestFoundClue;

  const sceneNameMap = Object.fromEntries(
    snapshot.caseData.scenes.map((sc) => [sc.sceneId, sc.title])
  );

  const inPenalty = Boolean(myPlayer && myPlayer.penaltyUntil > Date.now());

  const handleSceneTabClick = (sceneId: string) => {
    if (isSpectator) {
      setSpectatorSceneId(sceneId);
    } else {
      onSelectScene(sceneId);
    }
  };

  const toNormalizedCoords = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { x: 960, y: 540 };
    }
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1920, Math.round(relX * 1920))),
      y: Math.max(0, Math.min(1080, Math.round(relY * 1080))),
    };
  };

  const handleStagePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (isSpectator || e.pointerType !== 'mouse') return;
    const { x, y } = toNormalizedCoords(e.clientX, e.clientY);
    onCursorMove(x, y);
  };

  const handleStagePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleStageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (pointerDownRef.current) {
      const dx = e.clientX - pointerDownRef.current.x;
      const dy = e.clientY - pointerDownRef.current.y;
      pointerDownRef.current = null;
      if (Math.hypot(dx, dy) > 12) return;
    }

    if (isSpectator) return;
    const { x, y } = toNormalizedCoords(e.clientX, e.clientY);
    onCursorMove(x, y);
    const hitClue = sceneClues.find(
      (c) =>
        x >= c.hotspot.x &&
        x <= c.hotspot.x + c.hotspot.width &&
        y >= c.hotspot.y &&
        y <= c.hotspot.y + c.hotspot.height
    );
    if (hitClue?.found) {
      setSelectedFoundClueId(hitClue.clueID);
      return;
    }
    onClueClick(activeSceneId, hitClue ? hitClue.clueID : null, x, y);
  };

  const handleSelectFoundMarker = (e: MouseEvent, clueId: string) => {
    e.stopPropagation();
    setSelectedFoundClueId((curr) => (curr === clueId ? null : clueId));
  };

  const handleSelectFoundFromList = (clueId: string, sceneId: string) => {
    if (sceneId !== activeSceneId) {
      handleSceneTabClick(sceneId);
    }
    setSelectedFoundClueId((curr) => (curr === clueId ? null : clueId));
  };

  const sceneImgUrl = CASE_IMAGES.crimeScenes[activeSceneId];
  const isImgBroken = Boolean(brokenScenes[activeSceneId]);

  return (
    <main
      className={`relative flex min-h-[calc(100dvh-3.5rem)] w-full flex-col gap-3 bg-slate-950 px-2.5 pt-2.5 pb-6 transition-[padding] duration-150 lg:h-screen lg:min-h-0 lg:w-screen lg:items-center lg:justify-center lg:gap-0 lg:overflow-hidden lg:px-3 lg:pt-14 lg:pb-16 ${
        logOpen ? 'lg:pr-[21.5rem]' : ''
      }`}
    >
      {/* 16:9 Crime Scene Stage */}
      <div
        ref={stageRef}
        onPointerMove={handleStagePointerMove}
        onPointerDown={handleStagePointerDown}
        onClick={handleStageClick}
        className={`relative aspect-video w-full max-w-[1600px] touch-manipulation select-none overflow-hidden rounded-xl border border-slate-700/90 bg-slate-900 shadow-2xl lg:max-h-full ${
          isSpectator ? 'cursor-default' : inPenalty ? 'cursor-not-allowed' : 'cursor-crosshair'
        }`}
      >
        {sceneImgUrl && !isImgBroken ? (
          <img
            src={sceneImgUrl}
            alt={`${activeSceneInfo.title} (1920x1080)`}
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() =>
              setBrokenScenes((prev) => ({
                ...prev,
                [activeSceneId]: true,
              }))
            }
            className="pointer-events-none h-full w-full object-fill"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-sm text-slate-400">
            {activeSceneInfo.title} (1920x1080)
          </div>
        )}

        {/* Found clue markers in current scene: compact check icon on mobile, inline label on md+ */}
        {sceneClues.map((clue) => {
          if (!clue.found) return null;
          const leftPct = (clue.hotspot.x / 1920) * 100;
          const topPct = (clue.hotspot.y / 1080) * 100;
          const widthPct = (clue.hotspot.width / 1920) * 100;
          const heightPct = (clue.hotspot.height / 1080) * 100;
          const isSelected = selectedFoundClueId === clue.clueID;

          return (
            <div
              key={clue.clueID}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
              onClick={(e) => handleSelectFoundMarker(e, clue.clueID)}
              className={`absolute animate-clue-pop cursor-pointer rounded-lg border-2 transition-colors ${
                isSelected
                  ? 'z-10 border-amber-400 bg-amber-400/15 ring-2 ring-amber-400/40'
                  : 'border-emerald-400/85 bg-emerald-500/10 hover:border-emerald-300'
              }`}
            >
              {/* Mobile (< md): Compact check icon only so view is unobstructed */}
              <button
                type="button"
                onClick={(e) => handleSelectFoundMarker(e, clue.clueID)}
                aria-label={`Lihat detail bukti ${clue.name}`}
                aria-pressed={isSelected}
                className={`inline-flex h-6 w-6 items-center justify-center rounded-br-md shadow-sm transition-colors md:hidden cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-950/90 text-emerald-300'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              </button>

              {/* Desktop / Tablet (md+): Check icon + truncated clue name */}
              <button
                type="button"
                onClick={(e) => handleSelectFoundMarker(e, clue.clueID)}
                aria-label={`Lihat detail bukti ${clue.name}`}
                aria-pressed={isSelected}
                className={`hidden max-w-full items-center gap-1 rounded-br-md px-2 py-0.5 text-xs font-semibold shadow-sm transition-colors md:inline-flex cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-950/90 text-emerald-300'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{clue.name}</span>
              </button>
            </div>
          );
        })}

        {/* Floating feedback markers scoped to active scene */}
        {feedbackMarkers
          .filter((marker) => !marker.sceneId || marker.sceneId === activeSceneId)
          .map((marker) => {
            const leftPct = Math.max(14, Math.min(86, (marker.x / 1920) * 100));
            const topPct = Math.max(12, Math.min(88, (marker.y / 1080) * 100));
            const isMiss = marker.status === 'MISS' || marker.status === 'COOLDOWN';
            return (
              <div
                key={marker.id}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                className={`pointer-events-none absolute z-20 max-w-[80%] -translate-x-1/2 -translate-y-1/2 truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold shadow-lg sm:px-2.5 sm:py-1 sm:text-xs ${
                  isMiss
                    ? 'animate-penalty-shake border-red-400/80 bg-red-950/95 text-red-200'
                    : 'animate-clue-pop border-amber-400/80 bg-slate-950/95 text-amber-300'
                }`}
              >
                {marker.label}
              </div>
            );
          })}

        {/* Real-time remote player cursors in the same Crime Scene */}
        {snapshot.players.map((player) => {
          if (player.isSpectator || player.id === myPlayerId) return null;
          const remote = remoteCursors[player.id];
          const remoteSceneId = remote?.sceneId ?? player.currentSceneId;
          if (remoteSceneId !== activeSceneId) return null;

          const posX = remote?.x ?? player.cursorX;
          const posY = remote?.y ?? player.cursorY;
          const leftPct = (posX / 1920) * 100;
          const topPct = (posY / 1080) * 100;
          return (
            <div
              key={player.id}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
              }}
              className="pointer-events-none absolute z-20 transition-transform duration-75"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="-translate-x-0.5 -translate-y-0.5 drop-shadow"
              >
                <path
                  d="M2.5 2L16.5 9.2L10.2 11.2L8.2 17.5L2.5 2Z"
                  fill={player.color}
                  stroke="#0F172A"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                style={{ backgroundColor: player.color }}
                className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-950 shadow whitespace-nowrap sm:text-[11px]"
              >
                {player.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile & Tablet (< lg): Clean below-scene callout, scene tabs, and compact found-clues list */}
      <div className="flex w-full flex-col gap-3 lg:hidden">
        {/* Inspected / Latest Clue Callout */}
        <div
          className={`rounded-xl border px-3.5 py-2.5 shadow-lg transition-colors ${
            selectedFoundClue
              ? 'border-amber-400/70 bg-slate-900'
              : 'border-slate-800 bg-slate-900/95'
          }`}
        >
          {inspectedClue ? (
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span
                    className={`font-semibold ${
                      selectedFoundClue ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    {selectedFoundClue ? 'Bukti Dipilih' : 'Temuan Terbaru'} · {inspectedClue.name}
                  </span>
                  {inspectedClue.foundByPlayerName && (
                    <span className="text-[11px] text-slate-400">
                      oleh {inspectedClue.foundByPlayerName}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  {inspectedClue.description}
                </p>
              </div>
              {selectedFoundClue && (
                <button
                  type="button"
                  onClick={() => setSelectedFoundClueId(null)}
                  aria-label="Tutup detail bukti terpilih"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 shrink-0 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Search className="h-4 w-4 text-amber-300 shrink-0" />
              <span>
                {isSpectator
                  ? 'Mode Penonton · Pilih tab lokasi untuk memantau detektif.'
                  : 'Ketuk barang bukti di 3 lokasi TKP. Salah ketuk memotong waktu tim 10 detik.'}
              </span>
            </div>
          )}
        </div>

        {/* Location Switcher Tabs (Thumb-friendly 44px height) */}
        <nav
          aria-label="Pilih lokasi TKP"
          className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-slate-900/95 p-1.5 shadow-lg"
        >
          {snapshot.caseData.scenes.map((scene, idx) => {
            const sceneTotal = allClues.filter((c) => c.scene === scene.sceneId).length;
            const sceneFound = allClues.filter((c) => c.scene === scene.sceneId && c.found).length;
            const isSelected = scene.sceneId === activeSceneId;
            const playersHere = snapshot.players.filter(
              (p) => !p.isSpectator && p.currentSceneId === scene.sceneId
            );
            const shortTitle = `TKP ${idx + 1}`;

            return (
              <button
                key={scene.sceneId}
                type="button"
                onClick={() => handleSceneTabClick(scene.sceneId)}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">{shortTitle}</span>
                <span className="hidden truncate sm:inline">{scene.title}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isSelected ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {sceneFound}/{sceneTotal}
                </span>
                {playersHere.length > 0 && (
                  <span className="hidden items-center gap-0.5 sm:flex" aria-hidden="true">
                    {playersHere.map((p) => (
                      <span
                        key={p.id}
                        style={{ backgroundColor: p.color }}
                        className="h-2 w-2 rounded-xs border border-slate-950/60"
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Compact Found Clues List Panel below Crime Scene */}
        <section
          aria-label="Daftar bukti ditemukan"
          className="rounded-xl border border-slate-800 bg-slate-900/95 p-3.5 shadow-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-100">
                Bukti Ditemukan ({totalFoundClues.length}/{allClues.length})
              </h2>
              <p className="text-[11px] text-slate-400">
                Ketuk ikon centang di gambar atau baris di bawah untuk melihat detail.
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setClueListScope('SCENE')}
                className={`min-h-[40px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  clueListScope === 'SCENE'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Lokasi Ini
              </button>
              <button
                type="button"
                onClick={() => setClueListScope('ALL')}
                className={`min-h-[40px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  clueListScope === 'ALL'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Semua TKP
              </button>
            </div>
          </div>

          {scopedFoundClues.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/50 px-3.5 py-4 text-center text-xs text-slate-400">
              {clueListScope === 'SCENE'
                ? 'Belum ada bukti ditemukan di lokasi ini.'
                : 'Belum ada bukti ditemukan di seluruh TKP.'}
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {scopedFoundClues.map((clue) => {
                const isSelected = selectedFoundClueId === clue.clueID;
                return (
                  <li key={clue.clueID}>
                    <button
                      type="button"
                      onClick={() => handleSelectFoundFromList(clue.clueID, clue.scene)}
                      className={`flex min-h-[44px] w-full flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-amber-400/80 bg-slate-800/90'
                          : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{clue.name}</span>
                        </span>
                        {clue.foundByPlayerName && (
                          <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                            {clue.foundByPlayerName}
                          </span>
                        )}
                      </div>
                      {clueListScope === 'ALL' && (
                        <span className="text-[11px] text-amber-300/90">
                          {sceneNameMap[clue.scene] || clue.scene}
                        </span>
                      )}
                      <p
                        className={`text-xs leading-relaxed text-slate-300 ${
                          isSelected ? '' : 'line-clamp-2'
                        }`}
                      >
                        {clue.description}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Desktop (lg+) Bottom Bar: Multi-Scene Switcher + Compact Clue Toast */}
      <div
        className={`pointer-events-none fixed bottom-3 left-4 right-4 z-20 hidden flex-wrap items-end justify-between gap-3 transition-[right] duration-150 lg:flex ${
          logOpen ? 'lg:right-[21.5rem]' : ''
        }`}
      >
        <div className="pointer-events-auto max-w-md rounded-lg border border-slate-700/90 bg-slate-900/95 px-3.5 py-2 shadow-xl">
          {inspectedClue ? (
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 text-xs text-emerald-300">
                  <span className="font-semibold">
                    {selectedFoundClue ? 'Bukti Dipilih' : 'Temuan Terbaru'} · {inspectedClue.name}
                  </span>
                  {inspectedClue.foundByPlayerName && (
                    <span className="text-slate-400">oleh {inspectedClue.foundByPlayerName}</span>
                  )}
                </div>
                <p className="line-clamp-1 text-xs text-slate-300">{inspectedClue.description}</p>
              </div>
              {selectedFoundClue && (
                <button
                  type="button"
                  onClick={() => setSelectedFoundClueId(null)}
                  aria-label="Tutup detail bukti terpilih"
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Search className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>
                {isSpectator
                  ? 'Mode Penonton · Pilih tab lokasi untuk memantau detektif.'
                  : 'Klik barang bukti di 3 lokasi TKP. Salah klik memotong waktu tim 10 detik.'}
              </span>
            </div>
          )}
        </div>

        <nav
          aria-label="Pilih lokasi TKP"
          className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700/90 bg-slate-900/95 p-1 shadow-xl"
        >
          {snapshot.caseData.scenes.map((scene) => {
            const sceneTotal = allClues.filter((c) => c.scene === scene.sceneId).length;
            const sceneFound = allClues.filter((c) => c.scene === scene.sceneId && c.found).length;
            const isSelected = scene.sceneId === activeSceneId;
            const playersHere = snapshot.players.filter(
              (p) => !p.isSpectator && p.currentSceneId === scene.sceneId
            );

            return (
              <button
                key={scene.sceneId}
                type="button"
                onClick={() => handleSceneTabClick(scene.sceneId)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{scene.title}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isSelected ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {sceneFound}/{sceneTotal}
                </span>
                {playersHere.length > 0 && (
                  <span className="flex items-center gap-0.5" aria-hidden="true">
                    {playersHere.map((p) => (
                      <span
                        key={p.id}
                        style={{ backgroundColor: p.color }}
                        className="h-2 w-2 rounded-xs border border-slate-950/60"
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
