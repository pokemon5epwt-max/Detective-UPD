import { useCallback, useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';

const OBR_ROOM_CODE_KEY = 'hoenn.detective.agency/roomCode';
const OBR_HOST_NAME_KEY = 'hoenn.detective.agency/hostName';
const OBR_MODAL_ID = 'hoenn.detective.agency/game';

export type ObrMode = 'standalone' | 'popover' | 'modal';

function detectObrMode(): ObrMode {
  if (typeof window === 'undefined') return 'standalone';
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('obr');
  if (mode === 'popover') return 'popover';
  if (mode === 'modal') return 'modal';
  return 'standalone';
}

export function getObrUrlParams(): { action: 'create' | 'join' | null; roomCode: string | null } {
  if (typeof window === 'undefined') return { action: null, roomCode: null };
  const params = new URLSearchParams(window.location.search);
  const actionParam = params.get('action');
  const roomParam = params.get('room');
  return {
    action: actionParam === 'create' || actionParam === 'join' ? actionParam : null,
    roomCode: roomParam ? roomParam.trim().toUpperCase() : null,
  };
}

export function useOwlbearRodeo() {
  const [obrMode] = useState<ObrMode>(() => detectObrMode());
  const isInOwlbear = OBR.isAvailable;

  const [obrReady, setObrReady] = useState(false);
  const [obrPlayerName, setObrPlayerName] = useState<string | null>(null);
  const [obrRole, setObrRole] = useState<'GM' | 'PLAYER' | null>(null);
  const [syncedRoomCode, setSyncedRoomCode] = useState<string | null>(null);
  const [syncedHostName, setSyncedHostName] = useState<string | null>(null);

  useEffect(() => {
    if (!isInOwlbear) return;

    let unsubscribeMetadata: (() => void) | undefined;
    let unsubscribePlayer: (() => void) | undefined;

    OBR.onReady(async () => {
      try {
        const [name, role, metadata] = await Promise.all([
          OBR.player.getName(),
          OBR.player.getRole(),
          OBR.room.getMetadata(),
        ]);

        setObrPlayerName(name || null);
        setObrRole(role);

        const code = metadata[OBR_ROOM_CODE_KEY];
        const host = metadata[OBR_HOST_NAME_KEY];
        setSyncedRoomCode(typeof code === 'string' && code ? code : null);
        setSyncedHostName(typeof host === 'string' && host ? host : null);
        setObrReady(true);

        unsubscribeMetadata = OBR.room.onMetadataChange((nextMeta) => {
          const nextCode = nextMeta[OBR_ROOM_CODE_KEY];
          const nextHost = nextMeta[OBR_HOST_NAME_KEY];
          setSyncedRoomCode(typeof nextCode === 'string' && nextCode ? nextCode : null);
          setSyncedHostName(typeof nextHost === 'string' && nextHost ? nextHost : null);
        });

        unsubscribePlayer = OBR.player.onChange((player) => {
          if (player.name) setObrPlayerName(player.name);
          if (player.role) setObrRole(player.role);
        });
      } catch {
        setObrReady(false);
      }
    });

    return () => {
      unsubscribeMetadata?.();
      unsubscribePlayer?.();
    };
  }, [isInOwlbear]);

  const syncRoomToOwlbear = useCallback(
    async (roomCode: string, hostName: string) => {
      if (!isInOwlbear || !OBR.isReady) return;
      try {
        await OBR.room.setMetadata({
          [OBR_ROOM_CODE_KEY]: roomCode,
          [OBR_HOST_NAME_KEY]: hostName,
        });
      } catch {
        // Ignore metadata write failure if user lacks permission
      }
    },
    [isInOwlbear]
  );

  const clearOwlbearRoom = useCallback(async () => {
    if (!isInOwlbear || !OBR.isReady) return;
    try {
      await OBR.room.setMetadata({
        [OBR_ROOM_CODE_KEY]: null,
        [OBR_HOST_NAME_KEY]: null,
      });
    } catch {
      // Ignore metadata write failure
    }
  }, [isInOwlbear]);

  const openModal = useCallback(
    async (action?: 'create' | 'join', roomCode?: string) => {
      if (!isInOwlbear || !OBR.isReady) return;
      const query = new URLSearchParams({ obr: 'modal' });
      if (action) query.set('action', action);
      if (roomCode) query.set('room', roomCode);

      await OBR.modal.open({
        id: OBR_MODAL_ID,
        url: `/?${query.toString()}`,
        fullScreen: true,
      });
    },
    [isInOwlbear]
  );

  const closeModal = useCallback(async () => {
    if (!isInOwlbear || !OBR.isReady) return;
    await OBR.modal.close(OBR_MODAL_ID);
  }, [isInOwlbear]);

  const notifyOwlbear = useCallback(
    async (message: string) => {
      if (!isInOwlbear || !OBR.isReady) return;
      try {
        await OBR.notification.show(message, 'INFO');
      } catch {
        // Ignore notification errors
      }
    },
    [isInOwlbear]
  );

  return {
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
  };
}
