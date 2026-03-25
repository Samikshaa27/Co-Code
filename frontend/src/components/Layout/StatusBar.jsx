import { useStore } from '../../store/useStore';
import { LANGUAGES } from '../../constants/languages';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCodeBranch, faCheckCircle, faGlobe, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

export function StatusBar() {
  const { 
    language, setLanguage, connectionStatus, cursorPosition, activeFileId, files, debugIssues 
  } = useStore();

  const file = files.find(f => f.id === activeFileId);
  const lang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];

  return (
    <footer className="status-bar">
      <div className="status-left">
        <div className="status-item connection" title={`Status: ${connectionStatus}`}>
          <div className={`status-dot ${connectionStatus}`} />
          <span>{connectionStatus}</span>
        </div>
        <div className="status-item branch" title="Git Branch">
           <FontAwesomeIcon icon={faCodeBranch} />
           <span>main</span>
        </div>
        {debugIssues.length > 0 && (
           <div className="status-item errors" title="Debug Issues">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>{debugIssues.length}</span>
           </div>
        )}
      </div>

      <div className="status-right">
        <div className="status-item cursor">
           Ln {cursorPosition.ln}, Col {cursorPosition.col}
        </div>
        <div className="status-item spaces">
           Spaces: 2
        </div>
        <div className="status-item encoding">
           UTF-8
        </div>
        <div 
          className="status-item language clickable"
          onClick={() => {
             // Clicking language should open the selector
             // We'll reuse the select from Topbar or just toggle a state
             document.getElementById('language-selector')?.focus();
             document.getElementById('language-selector')?.click();
          }}
          title="Change language"
        >
          {lang.label}
        </div>
        <div className="status-item check">
           <FontAwesomeIcon icon={faCheckCircle} />
           <span>Prettier</span>
        </div>
      </div>
    </footer>
  );
}
