import { useStore } from '../../store/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faMagnifyingGlass, faGear, faPlay } from '@fortawesome/free-solid-svg-icons';

export function ActivityBar() {
  const { sidebarTab, setSidebarTab, toggleSidebar, isSidebarOpen } = useStore();
  
  const handleTabClick = (tab) => {
    if (sidebarTab === tab && isSidebarOpen) {
       toggleSidebar();
    } else {
       setSidebarTab(tab);
    }
  };

  return (
    <aside className="activity-bar">
      <div className="activity-bar-top">
        <button 
          id="activity-explorer"
          className={`activity-icon ${sidebarTab === 'explorer' && isSidebarOpen ? 'active' : ''}`}
          onClick={() => handleTabClick('explorer')}
          title="Explorer"
        >
          <FontAwesomeIcon icon={faFile} />
        </button>
        <button 
          id="activity-search"
          className={`activity-icon ${sidebarTab === 'search' && isSidebarOpen ? 'active' : ''}`}
          onClick={() => handleTabClick('search')}
          title="Search"
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />
        </button>
      </div>
      <div className="activity-bar-bottom">
        <button 
          id="activity-settings"
          className={`activity-icon ${sidebarTab === 'settings' && isSidebarOpen ? 'active' : ''}`}
          onClick={() => handleTabClick('settings')}
          title="Settings"
        >
          <FontAwesomeIcon icon={faGear} />
        </button>
      </div>
    </aside>
  );
}

