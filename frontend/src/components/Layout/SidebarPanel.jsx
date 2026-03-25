import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faFileAlt, faChevronRight, faChevronDown, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { FileTree } from './FileTree';

export function SidebarPanel({ broadcastFileAction }) {
  const { sidebarTab, files, openFile, activeFileId, editorOptions, updateEditorOptions } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (sidebarTab === 'explorer' || sidebarTab === 'search') {
    return (
      <div className="sidebar-panel">
        <div className="sidebar-header">
           <h3>{sidebarTab === 'explorer' ? 'EXPLORER' : 'SEARCH'}</h3>
        </div>
        
        {sidebarTab === 'search' && (
           <div className="search-bar">
             <div className="search-input-wrapper">
               <FontAwesomeIcon icon={faSearch} size="xs" />
               <input 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
                 placeholder="Search files..."
                 className="search-input"
                 autoFocus
               />
             </div>
           </div>
        )}

        {sidebarTab === 'explorer' && <FileTree broadcastFileAction={broadcastFileAction} />}
        
        {sidebarTab === 'search' && (
           <div className="file-tree">
             {filteredFiles.map(file => (
                <div 
                  key={file.id} 
                  className={`file-item ${activeFileId === file.id ? 'active' : ''}`}
                  onClick={() => openFile(file.id)}
                >
                  <FontAwesomeIcon icon={faFileAlt} size="xs" />
                  <span className="file-name">{file.name}</span>
                  {file.isDirty && <span className="dirty-dot" />}
                </div>
             ))}
           </div>
        )}
      </div>
    );
  }

  if (sidebarTab === 'settings') {
    return (
      <div className="sidebar-panel">
        <div className="sidebar-header">
           <h3>SETTINGS</h3>
        </div>
        <div className="settings-list">
           <div className="setting-item">
             <label>Font Size</label>
             <div className="setting-controls">
                <button onClick={() => updateEditorOptions({ fontSize: editorOptions.fontSize - 1 })}>-</button>
                <span>{editorOptions.fontSize}px</span>
                <button onClick={() => updateEditorOptions({ fontSize: editorOptions.fontSize + 1 })}>+</button>
             </div>
           </div>
           
           <div className="setting-item">
             <label>Tab Size</label>
             <div className="setting-actions">
                <button 
                  className={editorOptions.tabSize === 2 ? 'active' : ''} 
                  onClick={() => updateEditorOptions({ tabSize: 2 })}
                >2</button>
                <button 
                  className={editorOptions.tabSize === 4 ? 'active' : ''} 
                  onClick={() => updateEditorOptions({ tabSize: 4 })}
                >4</button>
             </div>
           </div>

           <div className="setting-item">
             <label>Word Wrap</label>
             <button 
               className={`btn-toggle ${editorOptions.wordWrap === 'on' ? 'active' : ''}`}
               onClick={() => updateEditorOptions({ wordWrap: editorOptions.wordWrap === 'on' ? 'off' : 'on' })}
             >
               {editorOptions.wordWrap === 'on' ? 'Enabled' : 'Disabled'}
             </button>
           </div>
        </div>
      </div>
    );
  }

  return null;
}
