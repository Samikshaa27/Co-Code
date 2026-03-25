import { useStore } from '../../store/useStore';

function renderMarkdown(text) {
  if (!text) return '';
  // Basic markdown: bold, inline code, code blocks, headers, bullets
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([a-z]*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

// ── Suggestion Panel ─────────────────────────────────────
export function SuggestionPanel() {
  const { aiSuggestion, aiSuggestionLoading } = useStore();

  return (
    <div className="suggestion-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Auto-refreshes as you type (1.5s debounce)
        </span>
      </div>

      {aiSuggestionLoading ? (
        <div className="suggestion-loading">
          <div className="spinner" />
          Analyzing your code...
        </div>
      ) : aiSuggestion ? (
        <div className={`suggestion-card fade-in ${aiSuggestion.includes('Error:') ? 'error-card' : ''}`}>
          <div className="suggestion-text">{aiSuggestion}</div>
          <div className="suggestion-meta">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {aiSuggestion.includes('Error:') ? 'AI Error' : 'AI Suggestion'}
            </span>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Start typing and AI will suggest improvements automatically</p>
        </div>
      )}
    </div>
  );
}

// ── Explanation Panel ────────────────────────────────────
export function ExplanationPanel({ onExplain }) {
  const { aiExplanation, aiExplanationLoading, code } = useStore();

  return (
    <div className="suggestion-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            console.log('[AiPanels] Explain Code clicked');
            onExplain();
          }}
          disabled={aiExplanationLoading}
        >
          {aiExplanationLoading ? 'Generating...' : 'Explain Code'}
        </button>
      </div>

      {aiExplanationLoading ? (
        <div className="suggestion-loading">
          <div className="spinner" />
          Generating detailed explanation...
        </div>
      ) : aiExplanation ? (
        <div className={`markdown-wrapper ${aiExplanation.includes('AI Error') ? 'error-card' : ''}`}>
           <div className="markdown fade-in"
             dangerouslySetInnerHTML={{ __html: renderMarkdown(aiExplanation) }}
           />
           {aiExplanation.includes('AI Error') && (
               <div style={{ padding: '0 12px 12px 12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    AI Error - Please check your API key or connectivity.
               </div>
           )}
        </div>
      ) : (
        <div className="empty-state">
          <p>Click "Explain Code" above to get a detailed code explanation</p>
        </div>
      )}
    </div>
  );
}
