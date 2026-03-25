import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { LANGUAGES } from '../constants/languages';

export function useRoom() {
  const { setAuth, setRoom, setLanguage, addToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createRoom = useCallback(async (language, displayName) => {
    setLoading(true);
    setError(null);
    try {
      const room = await api.createRoom(language);
      const auth = await api.guestLogin(displayName, room.roomId);

      setAuth({
        token: auth.token,
        sessionId: auth.sessionId,
        displayName: auth.displayName,
        color: auth.color,
        roomId: auth.roomId,
      });
      setRoom({ ...room, id: room.roomId });
      setLanguage(language);

      // Update URL
      window.history.pushState({}, '', `/?room=${room.roomId}`);
      return room;
    } catch (e) {
      const msg = e.message || 'Failed to create room';
      setError(msg);
      addToast({ type: 'error', message: msg });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (roomId, displayName) => {
    setLoading(true);
    setError(null);
    try {
      const room = await api.getRoom(roomId);
      const auth = await api.guestLogin(displayName, roomId);

      setAuth({
        token: auth.token,
        sessionId: auth.sessionId,
        displayName: auth.displayName,
        color: auth.color,
        roomId: auth.roomId,
      });
      setRoom({ ...room, id: room.roomId });
      setLanguage(room.language);

      window.history.pushState({}, '', `/?room=${roomId}`);
      return room;
    } catch (e) {
      const msg = e.message || 'Room not found or expired';
      setError(msg);
      addToast({ type: 'error', message: msg });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createRoom, joinRoom, loading, error };
}
