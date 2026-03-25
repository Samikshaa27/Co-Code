import { useStore } from '../../store/useStore';

function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([a-z]*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>');
  return `<p>${html}</p>`;
}

const SEVERITY_LABEL = { error: 'Error', warning: 'Warning', info: 'Info' };

// ── Debug Issues Panel ───────────────────────────────────
export function DebugPanel({ onJumpToLine }) {
  const { debugIssues, debugLoading } = useStore();

  return (
    <div className="debug-panel">
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', flexShrink: 0 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-scans as you type (2s debounce)</span>
        {debugIssues.length > 0 && (
          <span className="badge badge-error">{debugIssues.length} issue{debugIssues.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {debugLoading ? (
        <div className="suggestion-loading">
          <div className="spinner" />
          Scanning for issues...
        </div>
      ) : debugIssues.length > 0 ? (
        <div className="debug-flag-list">
          {debugIssues.map((issue, i) => (
            <div
              key={i}
              className={`debug-flag ${issue.severity}`}
              onClick={() => onJumpToLine?.(issue.line)}
              role="button"
              tabIndex={0}
            >
              <span className="debug-flag-line">L{issue.line}</span>
              <div className="debug-flag-content">
                <div className="debug-flag-message">
                  <span style={{ fontWeight: 'bold', marginRight: 4 }}>{SEVERITY_LABEL[issue.severity]?.toUpperCase()}:</span> {issue.message}
                </div>
                {issue.fix && (
                  <div className="debug-flag-fix">Fix: {issue.fix}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No issues detected. Code looks clean!</p>
        </div>
      )}
    </div>
  );
}

// ── Deep Debug Panel ─────────────────────────────────────
export function DeepDebugPanel({ onDeepDebug }) {
  const { deepDebug, deepDebugLoading } = useStore();

  return (
    <div className="debug-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, background: 'var(--bg-elevated)', flexShrink: 0 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={onDeepDebug}
          disabled={deepDebugLoading}
        >
          {deepDebugLoading ? 'Analyzing...' : 'Deep Debug'}
        </button>
      </div>

      {deepDebugLoading ? (
        <div className="suggestion-loading" style={{ flexDirection: 'column', gap: 16, padding: 32 }}>
          <div className="spinner spinner-lg" />
          <div>Running comprehensive debug analysis...</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>This may take 10–20 seconds</div>
        </div>
      ) : deepDebug ? (
        <div className={`deep-debug-content fade-in ${deepDebug.success === false ? 'error-card' : ''}`}>
          {deepDebug.rootCause && (
            <div className="deep-debug-section">
              <h4>Root Cause</h4>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>{deepDebug.rootCause}</p>
            </div>
          )}
          {deepDebug.analysis && (
            <div className="deep-debug-section">
              <h4>Analysis</h4>
              <div className="markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(deepDebug.analysis) }}
              />
            </div>
          )}
          {deepDebug.fixes?.length > 0 && (
            <div className="deep-debug-section">
              <h4>Suggested Fixes</h4>
              {deepDebug.fixes.map((fix, i) => (
                <div key={i} className="fix-item">
                  <div className="fix-number">{i + 1}</div>
                  <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: 1.5 }}>{fix}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>Click "Deep Debug" above for a comprehensive AI-powered code analysis with root cause detection</p>
        </div>
      )}
    </div>
  );
}
