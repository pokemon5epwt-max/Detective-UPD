import { useEffect, useRef, useState } from 'react';
import { CrimeSceneView } from './components/CrimeSceneView';
import { GameHud } from './components/GameHud';
import { InvestigationBoardView } from './components/InvestigationBoardView';
import { InvestigationLogPanel } from './components/InvestigationLogPanel';
import { OwlbearPopoverView } from './components/OwlbearPopoverView';
import { TitleLobbyScreen } from './components/TitleLobbyScreen';
import { VerdictView } from './components/VerdictView';
import { useDetectiveSocket } from './hooks/useDetectiveSocket';
import { getObrUrlParams, useOwlbearRodeo } from './hooks/useOwlbearRodeo';

export default function App() {
  const [logOpen, setLogOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1180 : true
  );
  const autoActionHandledRef = useRef(false);

  const {
    isInOwlbear,
    obrMode,
    obrReady,
    obrPlayerName,
    obrRole,
    syncedRoomCode,
    syncedHostName,
    syncRoomToOwlbear,
    clearOwlbearRoom,
    openModal,
    closeModal,
    notifyOwlbear,
  } = useOwlbearRodeo();

  const {
    connected,
    playerId,
    snapshot,
    remoteCursors,
    errorMsg,
    noticeMsg,
    feedbackMarkers,
    muted,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    restartLobby,
    selectCrimeScene,
    sendCursorMove,
    sendClueClick,
    advancePhase,
    selectSuspect,
    chooseDialogue,
    castVote,
    toggleMute,
  } = useDetectiveSocket();

  const me = snapshot?.players.find((p) => p.id === playerId);
  const isHost = Boolean(snapshot && playerId && snapshot.hostId === playerId);
  const isSpectator = Boolean(me?.isSpectator);

  // Auto-create or auto-join when launched from Owlbear Rodeo popover action
  useEffect(() => {
    if (obrMode !== 'modal' || !obrReady || !connected || snapshot || autoActionHandledRef.current) {
      return;
    }
    const { action, roomCode } = getObrUrlParams();
    if (!action) return;

    autoActionHandledRef.current = true;
    const resolvedName = obrPlayerName || (obrRole === 'GM' ? 'Detektif GM' : 'Detektif Owlbear');

    if (action === 'create') {
      createRoom(resolvedName);
    } else if (action === 'join' && roomCode) {
      joinRoom(roomCode, resolvedName);
    }
  }, [obrMode, obrReady, connected, snapshot, obrPlayerName, obrRole, createRoom, joinRoom]);

  // Sync created room code to Owlbear Rodeo room metadata so party members can join in 1 click
  useEffect(() => {
    if (!isInOwlbear || !obrReady || !snapshot || !isHost) return;
    if (syncedRoomCode === snapshot.roomCode) return;

    const hostName = me?.name || obrPlayerName || 'Host';
    void syncRoomToOwlbear(snapshot.roomCode, hostName);
    void notifyOwlbear(`Room investigasi ${snapshot.roomCode} siap di Hoenn Detective Agency!`);
  }, [
    isInOwlbear,
    obrReady,
    snapshot,
    isHost,
    syncedRoomCode,
    me?.name,
    obrPlayerName,
    syncRoomToOwlbear,
    notifyOwlbear,
  ]);

  const handleLeaveRoom = () => {
    if (isInOwlbear && isHost && snapshot && syncedRoomCode === snapshot.roomCode) {
      void clearOwlbearRoom();
    }
    leaveRoom();
  };

  if (obrMode === 'popover') {
    return (
      <OwlbearPopoverView
        obrReady={obrReady}
        obrPlayerName={obrPlayerName}
        obrRole={obrRole}
        syncedRoomCode={syncedRoomCode}
        syncedHostName={syncedHostName}
        onOpenModal={openModal}
        onClearRoom={clearOwlbearRoom}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      {noticeMsg && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 rounded-lg border border-amber-500/50 bg-slate-900/95 px-4 py-2.5 text-xs font-medium text-amber-200 shadow-xl"
        >
          {noticeMsg}
        </div>
      )}

      {!snapshot || !playerId || snapshot.phase === 'LOBBY' ? (
        <TitleLobbyScreen
          connected={connected}
          playerId={playerId}
          snapshot={snapshot}
          errorMsg={errorMsg}
          muted={muted}
          obrMode={obrMode}
          obrPlayerName={obrPlayerName}
          syncedRoomCode={syncedRoomCode}
          onCloseObrModal={closeModal}
          onToggleMute={toggleMute}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onStartGame={startGame}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <>
          <GameHud
            snapshot={snapshot}
            isHost={isHost}
            isSpectator={isSpectator}
            muted={muted}
            logOpen={logOpen}
            obrMode={obrMode}
            onCloseObrModal={closeModal}
            onToggleLog={() => setLogOpen((prev) => !prev)}
            onToggleMute={toggleMute}
            onAdvancePhase={advancePhase}
            onLeaveRoom={handleLeaveRoom}
          />

          <InvestigationLogPanel
            logs={snapshot.investigationLogs}
            open={logOpen}
            onClose={() => setLogOpen(false)}
          />

          {snapshot.phase === 'CRIME_SCENE' && (
            <CrimeSceneView
              snapshot={snapshot}
              myPlayerId={playerId}
              isSpectator={isSpectator}
              logOpen={logOpen}
              remoteCursors={remoteCursors}
              feedbackMarkers={feedbackMarkers}
              onSelectScene={selectCrimeScene}
              onCursorMove={sendCursorMove}
              onClueClick={sendClueClick}
            />
          )}

          {snapshot.phase === 'INVESTIGATION_BOARD' && (
            <InvestigationBoardView
              snapshot={snapshot}
              isSpectator={isSpectator}
              logOpen={logOpen}
              onSelectSuspect={selectSuspect}
              onChooseDialogue={chooseDialogue}
            />
          )}

          {(snapshot.phase === 'VERDICT' || snapshot.phase === 'RESULT') && (
            <VerdictView
              snapshot={snapshot}
              myPlayerId={playerId}
              isHost={isHost}
              isSpectator={isSpectator}
              logOpen={logOpen}
              onCastVote={castVote}
              onRestartLobby={restartLobby}
            />
          )}
        </>
      )}
    </div>
  );
}
