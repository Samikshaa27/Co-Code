import { useStore } from '../../store/useStore';

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  const icon = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type || 'info'}`} role="alert">
          <span>{icon[toast.type] || 'ℹ️'}</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
