import { useState, useCallback, useRef } from 'react';
import './index.css';
import './App.css';

import { useStore } from './store/useStore';
import { useCollaboration } from './hooks/useCollaboration';
import { useAI } from './hooks/useAI';

import { JoinScreen } from './components/Room/JoinScreen';
import { LandingPage } from './components/Room/LandingPage';
import { Topbar } from './components/Room/Topbar';
import { CollabEditor } from './components/Editor/CollabEditor';
import { UsersPanel } from './components/Room/UsersPanel';
import { SuggestionPanel, ExplanationPanel } from './components/AI/AiPanels';
import { DebugPanel, DeepDebugPanel } from './components/AI/DebugPanels';
import { ChatPanel } from './components/Room/ChatPanel';
import { HistoryPanel } from './components/Room/HistoryPanel';
import { BOILERPLATES } from './constants/boilerplates';
import { ToastContainer } from './components/UI/ToastContainer';


import { ActivityBar } from './components/Layout/ActivityBar';
import { SidebarPanel } from './components/Layout/SidebarPanel';
import { TabBar } from './components/Layout/TabBar';
import { StatusBar } from './components/Layout/StatusBar';
import { OutputPanel } from './components/Layout/OutputPanel';
import { useEffect as useAppEffect } from 'react';

function EditorApp() {
  const { 
    roomId, room, isPanelOpen, activePanel, setActivePanel, 
    debugIssues, language, code, setCode,
    isSidebarOpen, activeFileId, saveFile
  } = useStore();

  const boilerplate = BOILERPLATES[language] || '';
  const initial = room?.initialCode || boilerplate;

  const { ydoc, sendCursorChange, saveSnapshot, sendCodeChange, sendChatMessage, broadcastFileAction, restoreSnapshot } = useCollaboration(roomId, initial);
  const { triggerSuggestion, getExplanation, triggerDebug, getDeepDebug } = useAI();

  const handleCodeChange = useCallback((c) => {
    setCode(c);
    sendCodeChange(c); // Requirement: emit code-change on every edit
    triggerSuggestion(c);
    triggerDebug(c);
  }, [triggerSuggestion, triggerDebug, setCode, sendCodeChange]);

  const handleExplain = useCallback(() => {
    getExplanation(code, null);
    setActivePanel('explain');
  }, [getExplanation, setActivePanel, code]);

  const handleDeepDebug = useCallback(() => {
    getDeepDebug(code);
    setActivePanel('deepdebug');
  }, [getDeepDebug, setActivePanel, code]);

  const handleJumpToLine = useCallback((line) => {
    // Scroll editor to line 
  }, []);

  // ── AI Auto Triggers (Requirement 11) ──────────────────
  useAppEffect(() => {
    if (code) {
       triggerSuggestion(code);
       triggerDebug(code);
    }
  }, [code, triggerSuggestion, triggerDebug]);

  // Global Ctrl+S handler
  useAppEffect(() => {
    const handleSave = (e) => {
       if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          if (activeFileId) saveFile(activeFileId);
       }
    };
    window.addEventListener('keydown', handleSave);
    return () => window.removeEventListener('keydown', handleSave);
  }, [activeFileId, saveFile]);

  return (
    <div className="app">
      <Topbar />

      <div className="main-layout">
        {/* Leftmost narrow activity bar */}
        <ActivityBar />

        {/* Side Panel (Explorer/Search/Settings) */}
        {isSidebarOpen && <SidebarPanel broadcastFileAction={broadcastFileAction} />}

        {/* Main Editor Area */}
        <div className="editor-area">
          <TabBar />
          
          <div className="editor-content">
            <CollabEditor
              ydoc={ydoc}
              sendCursorChange={sendCursorChange}
              sendCodeChange={sendCodeChange}
              saveSnapshot={saveSnapshot}
              onCodeChange={handleCodeChange}
              debugIssues={debugIssues}
            />
          </div>

          <OutputPanel />
        </div>

        {/* AI side panel (on the right) */}
        {isPanelOpen && (
          <div className="side-panel slide-in-right">
            {/* Tabs */}
            <div className="panel-tabs">
              <button id="tab-suggest" className={`panel-tab ${activePanel === 'suggest' ? 'active' : ''}`} onClick={() => setActivePanel('suggest')}>
                Suggest
              </button>
              <button id="tab-explain" className={`panel-tab ${activePanel === 'explain' ? 'active' : ''}`} onClick={() => setActivePanel('explain')}>
                Explain
              </button>
              <button id="tab-debug" className={`panel-tab ${activePanel === 'debug' ? 'active' : ''}`} onClick={() => setActivePanel('debug')}>
                Debug
                {debugIssues.length > 0 && (
                  <span style={{ background: 'var(--danger)', color: 'white', fontSize: '0.6rem', padding: '0 4px', borderRadius: '8px', marginLeft: 2 }}>
                    {debugIssues.length}
                  </span>
                )}
              </button>
              <button id="tab-deepdebug" className={`panel-tab ${activePanel === 'deepdebug' ? 'active' : ''}`} onClick={() => setActivePanel('deepdebug')}>
                Deep Debug
              </button>
              <button id="tab-users" className={`panel-tab ${activePanel === 'users' ? 'active' : ''}`} onClick={() => setActivePanel('users')}>
                Users
              </button>
              <button id="tab-chat" className={`panel-tab ${activePanel === 'chat' ? 'active' : ''}`} onClick={() => setActivePanel('chat')}>
                Chat
              </button>
              <button id="tab-history" className={`panel-tab ${activePanel === 'history' ? 'active' : ''}`} onClick={() => setActivePanel('history')}>
                History
              </button>
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {activePanel === 'suggest' && <SuggestionPanel />}
              {activePanel === 'explain' && <ExplanationPanel onExplain={handleExplain} />}
              {activePanel === 'debug' && <DebugPanel onJumpToLine={handleJumpToLine} />}
              {activePanel === 'deepdebug' && <DeepDebugPanel onDeepDebug={handleDeepDebug} />}
              {activePanel === 'users' && <div style={{ overflow: 'auto', flex: 1 }}><UsersPanel /></div>}
              {activePanel === 'chat' && <ChatPanel sendChatMessage={sendChatMessage} />}
              {activePanel === 'history' && <HistoryPanel restoreSnapshot={restoreSnapshot} />}
            </div>
          </div>
        )}
      </div>

      <StatusBar />
    </div>
  );
}

export default function App() {
  const { token, roomId } = useStore();
  const [showJoin, setShowJoin] = useState(false);
  const isAuthenticated = !!(token && roomId);

  if (isAuthenticated) {
    return (
      <>
        <EditorApp />
        <ToastContainer />
      </>
    );
  }

  const handleGetStarted = () => {
    setShowJoin(true);
  };

  return (
    <div className="public-layout">
      {!showJoin ? (
        <LandingPage onGetStarted={handleGetStarted} />
      ) : (
        <div id="start-section" className="fade-in">
          <JoinScreen />
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
