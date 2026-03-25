import { useStore } from '../../store/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlay, faSave } from '@fortawesome/free-solid-svg-icons';

export function TabBar() {
  const { 
    openFileIds, files, activeFileId, setActiveFile, closeFile, saveFile, 
    toggleOutput, isOutputOpen, code, language, addToast 
  } = useStore();

  const handleRun = () => {
    toggleOutput(true);
    addToast({ type: 'info', message: 'Executing code...' });
    // Mock run logic as per point 11
    setTimeout(() => {
       addToast({ type: 'success', message: 'Execution complete.' });
    }, 1500);
  };

  const handleSave = () => {
     if (activeFileId) {
        saveFile(activeFileId);
        addToast({ type: 'success', message: 'File saved.' });
     }
  };

  return (
    <div className="tab-bar-container">
      <div className="tab-list">
        {openFileIds.map(id => {
          const file = files.find(f => f.id === id);
          if (!file) return null;
          return (
            <div 
              key={id} 
              className={`tab-item ${activeFileId === id ? 'active' : ''}`}
              onClick={() => setActiveFile(id)}
            >
              <span className="tab-name">{file.name}</span>
              {file.isDirty && <span className="tab-dirty-dot" />}
              <button 
                className="tab-close" 
                onClick={(e) => { e.stopPropagation(); closeFile(id); }}
                title="Close Tab"
              >
                <FontAwesomeIcon icon={faTimes} size="xs" />
              </button>
            </div>
          );
        })}
      </div>
      
      <div className="tab-actions">
        <button className="btn-save" onClick={handleSave} title="Save (Ctrl+S)">
           <FontAwesomeIcon icon={faSave} />
        </button>
        <button className="btn-run" onClick={handleRun} title="Run Code">
           <FontAwesomeIcon icon={faPlay} />
           <span>Run</span>
        </button>
      </div>
    </div>
  );
}
