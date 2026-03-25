import { useStore } from '../../store/useStore';
import { LANGUAGES } from '../../constants/languages';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faShare, faCode, faHistory, faComment } from '@fortawesome/free-solid-svg-icons';

export function Topbar() {
  const {
    roomId, displayName, color, language,
    setLanguage, connectionStatus, rateLimitRemaining,
    users, isPanelOpen, togglePanel, activePanel, setActivePanel,
    addToast, sessionId, code, setOutput, toggleOutput
  } = useStore();

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      addToast({ type: 'success', message: 'Room ID copied to clipboard!' });
    });
  };

  const copyShareUrl = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      addToast({ type: 'success', message: 'Share link copied!' });
    });
  };

  const handleRun = async () => {
    addToast({ type: 'info', message: 'Running code...' });
    toggleOutput(true);
    setOutput('Running...');

    try {
      const resp = await fetch('/api/execution/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code })
      });
      
      if (!resp.ok) throw new Error('Execution failed');
      const data = await resp.json();
      
      let out = data.output || '';
      if (data.error) out += '\nERROR:\n' + data.error;
      if (!out && data.exitCode !== 0) out = `Process exited with code ${data.exitCode}`;
      
      setOutput(out || 'Execution completed with no output.');
    } catch (err) {
      setOutput('Error: ' + err.message);
      addToast({ type: 'error', message: 'Execution failed' });
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-logo">CO-CODE</div>

      <button
        id="btn-copy-room-id"
        className="topbar-room-id"
        onClick={copyRoomId}
        title="Click to copy Room ID"
      >
        {roomId?.slice(0, 8)}...
      </button>

      <div className="topbar-lang">
        <select
          id="language-selector"
          className="select"
          value={language}
          onChange={e => setLanguage(e.target.value)}
        >
          {LANGUAGES.map(l => (
            <option key={l.id} value={l.id}>{l.icon} {l.label}</option>
          ))}
        </select>
      </div>

      <div className="topbar-spacer" />

      <div className="connection-status">
        <div className={`status-dot ${connectionStatus}`} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{connectionStatus}</span>
      </div>

      <div className="topbar-users">
        {/* Current User */}
        <div
          className="user-avatar"
          style={{ background: color, border: '2px solid var(--accent)', transform: 'scale(1.1)', zIndex: 10 }}
          title={`${displayName} (You)`}
        >
          {displayName?.slice(0, 1).toUpperCase()}
        </div>

        {/* Other Users */}
        {users
          .filter(u => u.sessionId !== sessionId)
          .slice(0, 4)
          .map((u, i) => (
            <div
              key={u.connectionId || u.sessionId}
              className="user-avatar"
              style={{ background: u.color, zIndex: 9 - i, marginLeft: -8 }}
              title={u.displayName}
            >
              {u.displayName?.slice(0, 1).toUpperCase()}
            </div>
          ))}
        {users.filter(u => u.sessionId !== sessionId).length > 4 && (
          <div className="user-avatar-more" style={{ marginLeft: -8, zIndex: 0 }}>
            +{users.filter(u => u.sessionId !== sessionId).length - 4}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <button className="btn btn-primary btn-sm" onClick={handleRun}>
          <FontAwesomeIcon icon={faPlay} /> Run
        </button>
        <button className="btn btn-secondary btn-sm" onClick={copyShareUrl}>
          <FontAwesomeIcon icon={faShare} /> Share
        </button>
        <button
          className={`btn btn-sm ${isPanelOpen ? 'btn-secondary' : 'btn-primary'}`}
          onClick={togglePanel}
        >
          {isPanelOpen ? 'Close' : 'Open'} Panel
        </button>
      </div>
    </header>
  );
}
