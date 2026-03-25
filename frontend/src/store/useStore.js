import { create } from 'zustand';
import { DEFAULT_FILE_STRUCTURES } from '../constants/fileStructures';
import { BOILERPLATES } from '../constants/boilerplates';
import { v4 as uuidv4 } from 'uuid';

export const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────
  token: null,
  sessionId: null,
  displayName: null,
  color: null,
  roomId: null,

  setAuth: (auth) => set(auth),

  // ── Room ──────────────────────────────────────────────
  room: null,
  setRoom: (room) => set({ room }),

  // ── Language ──────────────────────────────────────────
  language: 'javascript',
  setLanguage: (language) => set({ language }),

  setRoomLanguage: (lang) => set(state => {
    const defaultFiles = DEFAULT_FILE_STRUCTURES[lang] || [{ name: 'main.' + lang, language: lang }];
    const files = defaultFiles.map(df => ({
      id: uuidv4(),
      name: df.name,
      content: BOILERPLATES[lang] || '',
      language: df.language,
      isDirty: false
    }));
    return { 
      language: lang, 
      files, 
      activeFileId: files[0]?.id || null, 
      openFileIds: files.map(f => f.id) 
    };
  }),

  // ── Users ─────────────────────────────────────────────
  users: [], // { sessionId, displayName, color, connectionId }
  addUser: (user) => set(state => {
    const filtered = state.users.filter(u => u.sessionId !== user.sessionId);
    return { users: [...filtered, user] };
  }),
  removeUser: (connectionId) => set(state => ({
    users: state.users.filter(u => u.connectionId !== connectionId)
  })),
  setUsers: (users) => set({ users }),

  // ── Cursors ───────────────────────────────────────────
  cursors: {}, // { connectionId: { displayName, color, line, column, lastUpdate, selection: { startLine, startColumn, endLine, endColumn } } }
  updateCursor: (connectionId, data) => set(state => ({
    cursors: { ...state.cursors, [connectionId]: { ...state.cursors[connectionId], ...data, lastUpdate: Date.now() } }
  })),
  removeCursor: (connectionId) => set(state => {
    const c = { ...state.cursors };
    delete c[connectionId];
    return { cursors: c };
  }),

  // ── Connection ────────────────────────────────────────
  connectionStatus: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  // ── Files & Tabs ──────────────────────────────────────
  files: [],
  activeFileId: null,
  openFileIds: [],
  isSidebarOpen: true,
  sidebarTab: 'explorer', // 'explorer' | 'search' | 'settings'
  isOutputOpen: false,
  output: '',
  cursorPosition: { ln: 1, col: 1 },
  editorOptions: { fontSize: 14, tabSize: 2, wordWrap: 'on' },

  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab, isSidebarOpen: true }),
  toggleOutput: (isOpen) => set(state => ({ isOutputOpen: isOpen ?? !state.isOutputOpen })),
  setOutput: (val) => set({ output: val }),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
  updateEditorOptions: (options) => set(state => ({ editorOptions: { ...state.editorOptions, ...options } })),
  
  setActiveFile: (id) => set((state) => {
    const file = state.files.find(f => f.id === id);
    return { activeFileId: id, code: file?.content || '', language: file?.language || 'javascript' };
  }),

  openFile: (id) => set((state) => {
    const newOpenIds = state.openFileIds.includes(id) ? state.openFileIds : [...state.openFileIds, id];
    const file = state.files.find(f => f.id === id);
    return { openFileIds: newOpenIds, activeFileId: id, code: file?.content || state.code, language: file?.language || state.language };
  }),

  closeFile: (id) => set((state) => {
    const newOpenIds = state.openFileIds.filter(fid => fid !== id);
    let nextId = state.activeFileId;
    if (state.activeFileId === id) {
       nextId = newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : null;
    }
    const nextFile = state.files.find(f => f.id === nextId);
    return { 
      openFileIds: newOpenIds, 
      activeFileId: nextId,
      code: nextFile?.content || '', 
      language: nextFile?.language || 'javascript'
    };
  }),

  saveFile: (id) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, isDirty: false } : f)
  })),

  addFile: (name, language, id = null, remote = false) => set((state) => {
    const newFile = {
      id: id || uuidv4(),
      name,
      content: '',
      language: language || 'plaintext',
      isDirty: false
    };
    return {
      files: [...state.files, newFile],
      openFileIds: [...state.openFileIds, newFile.id],
      activeFileId: newFile.id,
      code: '',
      language: newFile.language
    };
  }),

  deleteFile: (id, remote = false) => set((state) => {
    const newFiles = state.files.filter(f => f.id !== id);
    const newOpenIds = state.openFileIds.filter(fid => fid !== id);
    let nextId = state.activeFileId;
    if (state.activeFileId === id) {
      nextId = newOpenIds.length > 0 ? newOpenIds[newOpenIds.length - 1] : null;
    }
    const nextFile = newFiles.find(f => f.id === nextId);
    return {
      files: newFiles,
      openFileIds: newOpenIds,
      activeFileId: nextId,
      code: nextFile?.content || '',
      language: nextFile?.language || 'javascript'
    };
  }),

  renameFile: (id, newName, remote = false) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, name: newName } : f)
  })),

  restoreProjectState: (files, activeFileId) => set((state) => {
    const nextFile = files.find(f => f.id === (activeFileId || state.activeFileId)) || files[0];
    return {
      files,
      activeFileId: nextFile?.id || null,
      openFileIds: files.map(f => f.id),
      code: nextFile?.content || '',
      language: nextFile?.language || 'javascript'
    };
  }),

  // ── AI ────────────────────────────────────────────────
  aiSuggestion: null,
  aiSuggestionLoading: false,
  setAiSuggestion: (s) => set({ aiSuggestion: s }),
  setAiSuggestionLoading: (v) => set({ aiSuggestionLoading: v }),

  aiExplanation: null,
  aiExplanationLoading: false,
  setAiExplanation: (e) => set({ aiExplanation: e }),
  setAiExplanationLoading: (v) => set({ aiExplanationLoading: v }),

  debugIssues: [],
  debugLoading: false,
  setDebugIssues: (issues) => set({ debugIssues: issues }),
  setDebugLoading: (v) => set({ debugLoading: v }),

  deepDebug: null,
  deepDebugLoading: false,
  setDeepDebug: (d) => set({ deepDebug: d }),
  setDeepDebugLoading: (v) => set({ deepDebugLoading: v }),
  code: '',
  setCode: (code) => set((state) => {
    const files = state.files.map(f => f.id === state.activeFileId ? { ...f, content: code, isDirty: true } : f);
    return { code, files };
  }),


  // ── UI state ──────────────────────────────────────────
  activePanel: 'suggest', // 'suggest' | 'explain' | 'debug' | 'deepdebug' | 'users' | 'chat' | 'history'
  setActivePanel: (p) => set({ activePanel: p }),

  isPanelOpen: true,
  togglePanel: () => set(state => ({ isPanelOpen: !state.isPanelOpen })),

  // ── Chat ─────────────────────────────────────────────
  chatMessages: [],
  addChatMessage: (msg) => set(state => ({
    chatMessages: [...state.chatMessages, { ...msg, id: uuidv4(), timestamp: new Date().toISOString() }]
  })),

  // ── History ───────────────────────────────────────────
  historySnapshots: [],
  setHistorySnapshots: (snapshots) => set({ historySnapshots: snapshots }),
  
  toasts: [],
  addToast: (toast) => {
    const id = Date.now();
    const duration = toast.duration || 4000;
    set(state => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })), duration);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}));
