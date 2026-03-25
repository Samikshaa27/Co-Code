import { useStore } from '../../store/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faUndo, faClock } from '@fortawesome/free-solid-svg-icons';

export function HistoryPanel({ restoreSnapshot }) {
  const { historySnapshots, addToast } = useStore();

  const handleRestore = (id) => {
    restoreSnapshot(id);
    addToast({ type: 'info', message: 'Requested snapshot restore...' });
  };

  const formatDistance = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <FontAwesomeIcon icon={faHistory} />
        <span>Session History</span>
      </div>
      <div className="history-list">
        {historySnapshots.map(snap => (
          <div key={snap.id} className="history-item">
            <div className="history-info">
              <FontAwesomeIcon icon={faClock} size="xs" />
              <div className="history-meta">
                <span className="history-time">{formatDistance(snap.savedAt)}</span>
                <span className="history-desc">{snap.description || 'Auto-saved'}</span>
              </div>
            </div>
            <button className="icon-btn small" onClick={() => handleRestore(snap.id)} title="Restore">
              <FontAwesomeIcon icon={faUndo} />
            </button>
          </div>
        ))}
        {historySnapshots.length === 0 && <div className="no-history">No snapshots saved yet. Auto-saves every 60s.</div>}
      </div>
    </div>
  );
}
