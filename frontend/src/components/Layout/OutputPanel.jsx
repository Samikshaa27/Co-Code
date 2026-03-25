import { useStore } from '../../store/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faTerminal } from '@fortawesome/free-solid-svg-icons';

export function OutputPanel() {
  const { isOutputOpen, toggleOutput, output, language, code } = useStore();

  if (!isOutputOpen) return null;

  return (
    <div className="output-panel slide-in-up">
      <div className="output-header">
        <div className="output-title">
          <FontAwesomeIcon icon={faTerminal} size="xs" />
          <span>OUTPUT</span>
        </div>
        <button className="output-close" onClick={() => toggleOutput(false)}>
           <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <div className="output-body">
        <div className="output-text">
           {output || `[Mock] Running ${language} code...\nOutput will appear here.`}
        </div>
      </div>
    </div>
  );
}
