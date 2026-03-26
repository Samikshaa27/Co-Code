import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as signalR from '@microsoft/signalr';
import * as Y from 'yjs';
import { useStore } from '../store/useStore';

/**
 * Handle Yjs + SignalR synchronization.
 */
export function useCollaboration(roomId, initialCode) {
  const ydoc = useMemo(() => new Y.Doc(), [roomId]);
  const connRef = useRef(null);
  const initialCodeRef = useRef(initialCode);

  const {
    addUser,
    removeUser,
    setUsers,
    updateCursor,
    removeCursor,
    setConnectionStatus,
    addToast,
    setRoomLanguage,
    addChatMessage,
    addFile,
    deleteFile,
    renameFile,
    token, sessionId, displayName, color
  } = useStore();

  useEffect(() => {
    if (!roomId || !token) return;

    const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
    const hubUrl = `${apiBase}/hubs/collab?roomId=${roomId.toLowerCase()}&displayName=${encodeURIComponent(displayName)}&color=${encodeURIComponent(color)}&sessionId=${sessionId}`;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    connRef.current = conn;

    const startConnection = async (attempt = 0) => {
      try {
        await conn.start();
        console.log('SignalR connected to room:', roomId);
      } catch (err) {
        console.error('SignalR start error:', err);
        if (attempt < 5) {
          setTimeout(() => startConnection(attempt + 1), 2000);
        }
      }
    };

    // ── Receive Yjs updates (Native Byte Arrays) ─────────────
    conn.on('ReceiveYjsUpdate', (update) => {
      try {
        let binaryUpdate;
        if (typeof update === 'string') {
          // Decode Base64 string to Uint8Array
          const binaryString = atob(update);
          binaryUpdate = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            binaryUpdate[i] = binaryString.charCodeAt(i);
          }
        } else {
          binaryUpdate = new Uint8Array(update);
        }
        
        Y.applyUpdate(ydoc, binaryUpdate, 'remote');
      } catch (e) {
        console.error('Failed to apply Yjs update', e);
      }
    });

    conn.on('CodeChangeReceived', (newCode) => {
      // Receive and apply remote code change (store-based sync)
      useStore.getState().setCode(newCode);
    });

    conn.on('StateRequestReceived', (targetCid) => {
      if (conn.state === signalR.HubConnectionState.Connected) {
        const state = Y.encodeStateAsUpdate(ydoc);
        conn.invoke('SendYjsUpdate', roomId.toLowerCase(), state).catch(() => {});
      }
    });

    // ── Handle cursor & presence ──────────────────────────
    conn.on('CursorChangeReceived', (data) => {
      updateCursor(data.connectionId, {
        displayName: data.displayName,
        color: data.color,
        sessionId: data.sessionId,
        ...data.data // contains position and selection
      });
    });

    conn.on('UserJoined', (user) => {
      addUser(user);
      if (user.sessionId !== sessionId) {
        addToast({ type: 'info', message: `${user.displayName} joined` });
        
        // When someone joins, send them our full state to be helpful
        if (conn.state === signalR.HubConnectionState.Connected) {
          const state = Y.encodeStateAsUpdate(ydoc);
          conn.invoke('SendYjsUpdate', roomId.toLowerCase(), state).catch(() => {});
        }
      }
    });

    conn.on('UserLeft', (data) => {
      removeUser(data.connectionId);
      removeCursor(data.connectionId);
      if (data.displayName && data.sessionId !== sessionId) {
         addToast({ type: 'info', message: `${data.displayName} left` });
      }
    });

    conn.on('RoomLanguageReceived', (lang) => {
      setRoomLanguage(lang);
    });

    conn.on('receive-message', (msg) => {
      console.log('Chat receive-message:', msg);
      addChatMessage(msg);
      // Feature: Show toast popup when msg received
      addToast({ 
        type: 'info', 
        message: `${msg.senderName}: ${msg.text.length > 30 ? msg.text.substring(0, 30) + '...' : msg.text}`,
        duration: 3000 
      });
    });

    conn.on('FileActionReceived', (action) => {
       const { type, file, id, newName } = action;
       if (type === 'create') addFile(file.name, file.language, file.id, true);
       else if (type === 'delete') deleteFile(id, true);
       else if (type === 'rename') renameFile(id, newName, true);
    });

    conn.on('HistoryReceived', (history) => {
      useStore.getState().setHistorySnapshots(history);
    });

    conn.on('SnapshotRestored', (snapshotContent) => {
      try {
        const data = JSON.parse(snapshotContent);
        if (data.files) {
          useStore.getState().restoreProjectState(data.files, data.activeFileId);
          addToast({ type: 'success', message: 'Snapshot restored!' });
        }
      } catch (e) {
         console.error('Failed to restore snapshot', e);
      }
    });

    conn.on('RoomUsers', (usersList) => setUsers(usersList));

    conn.onreconnecting(() => setConnectionStatus('connecting'));
    conn.onreconnected(() => {
      setConnectionStatus('connected');
      conn.invoke('RequestYjsState', roomId.toLowerCase()).catch(() => {});
    });
    conn.onclose(() => setConnectionStatus('disconnected'));

    // ── Broadcast Yjs updates (Local to Hub) ───────────────
    ydoc.on('update', (update, origin) => {
      if (origin !== 'remote' && conn.state === signalR.HubConnectionState.Connected) {
        conn.invoke('SendYjsUpdate', roomId.toLowerCase(), update).catch(err => {
           console.error('Failed to send Yjs update:', err);
        });
      }
    });

    setConnectionStatus('connecting');
    startConnection().then(() => {
      setConnectionStatus('connected');
      conn.invoke('RequestYjsState', roomId.toLowerCase()).catch(() => {});
      conn.invoke('RequestSessionHistory', roomId.toLowerCase()).catch(() => {});
      
      // Robust Fallback: Double check sync in 2s
      setTimeout(() => {
         if (conn.state === signalR.HubConnectionState.Connected) {
           conn.invoke('RequestYjsState', roomId.toLowerCase()).catch(() => {});
         }
      }, 2000);
    });

    // ── Periodic Autosave (60s) ───────────────────────
    const saveInterval = setInterval(() => {
       if (conn.state === signalR.HubConnectionState.Connected) {
         const state = useStore.getState();
         const data = JSON.stringify({
            files: state.files,
            roomId: roomId.toLowerCase()
         });
         conn.invoke('SaveSnapshot', roomId.toLowerCase(), data).catch(() => {});
       }
    }, 60000);

    return () => {
      clearInterval(saveInterval);
      
      // Clean up specific listeners (Literal requirement)
      conn.off('ReceiveYjsUpdate');
      conn.off('CodeChangeReceived');
      conn.off('CursorChangeReceived');
      conn.off('UserJoined');
      conn.off('UserLeft');
      conn.off('RoomLanguageReceived');
      conn.off('receive-message');
      conn.off('FileActionReceived');
      conn.off('HistoryReceived');
      conn.off('SnapshotRestored');
      conn.off('RoomUsers');
      conn.off('StateRequestReceived');

      conn.stop().catch(() => {});
      ydoc.destroy();
    };
  }, [roomId, token, sessionId, displayName, color, ydoc]);

  const sendCursorChange = useCallback((cursorData) => {
    // Point 4: Emit cursor position and selection together
    const conn = connRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected && roomId) {
      conn.invoke('SendCursorChange', roomId.toLowerCase(), cursorData).catch(() => {});
    }
  }, [roomId]);

  const sendCodeChange = useCallback((code) => {
    // Point 1: Emit on change
    const conn = connRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected && roomId) {
      conn.invoke('SendCodeChange', roomId.toLowerCase(), code).catch(err => {
        console.error('Failed to send code change:', err);
      });
    }
  }, [roomId]);

  const sendChatMessage = useCallback((message) => {
    const conn = connRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected && roomId) {
      // Append locally for instant feedback
      addChatMessage({
        id: Math.random().toString(36).substring(7),
        senderSessionId: sessionId,
        senderName: displayName,
        senderColor: color,
        text: message,
        timestamp: new Date().toISOString()
      });
      console.log('Chat send-message (global):', message);
      // Emit send-message (no roomId filtering)
      conn.invoke('send-message', message).catch((e) => console.error('Send Error:', e));
    }
  }, [roomId, sessionId, displayName, color, addChatMessage]);

  const broadcastFileAction = useCallback((action) => {
    const conn = connRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected && roomId) {
      conn.invoke('BroadcastFileAction', roomId.toLowerCase(), action).catch(() => {});
    }
  }, [roomId]);

  const requestSessionHistory = useCallback(() => {
    const conn = connRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected && roomId) {
      conn.invoke('RequestSessionHistory', roomId.toLowerCase()).catch(() => {});
    }
  }, [roomId]);

  const saveSnapshot = useCallback((content) => {
    const conn = connRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected && roomId) {
      conn.invoke('SaveSnapshot', roomId.toLowerCase(), content).catch(() => {});
    }
  }, [roomId]);

  const restoreSnapshot = useCallback((snapshotId) => {
    const conn = connRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected && roomId) {
      conn.invoke('RestoreSnapshot', roomId.toLowerCase(), snapshotId).catch(() => {});
    }
  }, [roomId]);

  // ── Sync Store with Yjs (For Snapshots) ─────────────────────
  const { activeFileId } = useStore();
  useEffect(() => {
    if (!activeFileId || !ydoc) return;
    const ytext = ydoc.getText(activeFileId);

    // Initial sync from Yjs to Store if store is empty or for consistency
    const currentYText = ytext.toString();
    if (currentYText && !useStore.getState().code) useStore.getState().setCode(currentYText);

    const observer = (event) => {
      // Receiver updates editor state (via store)
      useStore.getState().setCode(ytext.toString());
    };
    ytext.observe(observer);
    return () => ytext.unobserve(observer);
  }, [activeFileId, ydoc]);

  return { 
    ydoc, sendCursorChange, saveSnapshot, sendCodeChange, 
    sendChatMessage, broadcastFileAction, requestSessionHistory, restoreSnapshot 
  };
}
