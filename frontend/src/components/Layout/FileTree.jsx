import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFile, faFileCode, faFileLines, 
  faPlus, faTrash, faEdit,
} from '@fortawesome/free-solid-svg-icons';
import { faJs, faPython, faHtml5, faCss3Alt } from '@fortawesome/free-brands-svg-icons';

const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': 
    case 'jsx': return <FontAwesomeIcon icon={faJs} style={{ color: '#f7df1e' }} />;
    case 'ts':
    case 'tsx': return <FontAwesomeIcon icon={faFileCode} style={{ color: '#3178c6' }} />;
    case 'py': return <FontAwesomeIcon icon={faPython} style={{ color: '#3776ab' }} />;
    case 'html': return <FontAwesomeIcon icon={faHtml5} style={{ color: '#e34f26' }} />;
    case 'css': return <FontAwesomeIcon icon={faCss3Alt} style={{ color: '#1572b6' }} />;
    case 'json': return <FontAwesomeIcon icon={faFileLines} style={{ color: '#fbc02d' }} />;
    case 'md': return <FontAwesomeIcon icon={faFileLines} style={{ color: '#03a9f4' }} />;
    default: return <FontAwesomeIcon icon={faFile} style={{ color: '#94a3b8' }} />;
  }
};

export function FileTree({ broadcastFileAction }) {
  const { files, activeFileId, setActiveFile, addFile, deleteFile, renameFile } = useStore();
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleRename = (id, name) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleAddFile = () => {
    const name = prompt('Enter file name:');
    if (name) {
      const id = crypto.randomUUID();
      const language = name.split('.').pop() || 'plaintext';
      addFile(name, language, id);
      broadcastFileAction({ type: 'create', file: { id, name, language } });
    }
  };

  const submitRename = (id) => {
    if (editingName.trim()) {
      renameFile(id, editingName.trim());
      broadcastFileAction({ type: 'rename', id, newName: editingName.trim() });
    }
    setEditingId(null);
  };

  const handleDelete = (id, name, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete ${name}?`)) {
      deleteFile(id);
      broadcastFileAction({ type: 'delete', id });
    }
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span>Files</span>
        <button onClick={handleAddFile} title="New File" className="icon-btn">
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
      <div className="file-list">
        {files.map(file => (
          <div 
            key={file.id} 
            className={`file-item ${activeFileId === file.id ? 'active' : ''}`}
            onClick={() => setActiveFile(file.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleRename(file.id, file.name);
            }}
          >
            <span className="file-icon">{getFileIcon(file.name)}</span>
            {editingId === file.id ? (
              <input 
                className="file-rename-input"
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => submitRename(file.id)}
                onKeyDown={(e) => e.key === 'Enter' && submitRename(file.id)}
              />
            ) : (
              <span className="file-name">{file.name}</span>
            )}
            
            <div className="file-actions">
              <button onClick={(e) => { e.stopPropagation(); handleRename(file.id, file.name); }} className="icon-btn small">
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button onClick={(e) => handleDelete(file.id, file.name, e)} className="icon-btn small danger">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </div>
        ))}
        {files.length === 0 && <div className="no-files">No files in project</div>}
      </div>
    </div>
  );
}
