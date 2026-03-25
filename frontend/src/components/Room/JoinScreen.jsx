import { useState, useEffect, useRef } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { useStore } from '../../store/useStore';
import { LANGUAGES } from '../../constants/languages';

function LangSlider({ selected, onSelect }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 5);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    const currentScrollRef = scrollRef.current;
    if (currentScrollRef) {
      currentScrollRef.addEventListener('scroll', checkScroll);
    }
    window.addEventListener('resize', checkScroll);
    return () => {
      if (currentScrollRef) {
        currentScrollRef.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (offset) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="lang-slider-container">
      {showLeft && (
        <button type="button" className="slider-btn left" onClick={() => scroll(-200)}>
          ‹
        </button>
      )}
      <div 
        className="lang-slider-row" 
        ref={scrollRef} 
        onScroll={checkScroll}
      >
        {LANGUAGES.map(lang => (
          <div
            key={lang.id}
            className={`lang-item ${selected === lang.id ? 'selected' : ''}`}
            onClick={() => onSelect(lang.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onSelect(lang.id)}
          >
            {/* Lang icon is removed as per visual reference if it doesn't fit the pill look */}
            <span>{lang.label}</span>
          </div>
        ))}
      </div>
      {showRight && (
        <button type="button" className="slider-btn right" onClick={() => scroll(200)}>
          ›
        </button>
      )}
    </div>
  );
}

export function JoinScreen() {
  const [tab, setTab] = useState('create'); // 'create' | 'join'
  const [displayName, setDisplayName] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [roomIdInput, setRoomIdInput] = useState('');
  const { createRoom, joinRoom, loading, error } = useRoom();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setTab('join');
      setRoomIdInput(room);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    if (tab === 'create') {
      await createRoom(language, displayName.trim());
    } else {
      if (!roomIdInput.trim()) return;
      await joinRoom(roomIdInput.trim(), displayName.trim());
    }
  };

  return (
    <div className="join-screen">
      <div className="join-card">
        {/* Logo Section */}
        <div className="join-logo-brand">
          <h1 className="brand-title-main">CoCode</h1>
          <div className="brand-subtitle">CODE &middot; COMPILE &middot; TOGETHER</div>
        </div>

        {/* Card Body */}
        <div className="main-join-container">
          {/* Tabs */}
          <div className="join-tabs-row">
            <button
              id="tab-create"
              className={`join-tab-btn ${tab === 'create' ? 'active' : ''}`}
              onClick={() => setTab('create')}
            >
              CREATE ROOM
            </button>
            <button
              id="tab-join"
              className={`join-tab-btn ${tab === 'join' ? 'active' : ''}`}
              onClick={() => setTab('join')}
            >
              JOIN ROOM
            </button>
          </div>

          <form className="join-form-content" onSubmit={handleSubmit}>
            <div className="form-input-group">
              <label className="form-label-mono" htmlFor="displayName">DISPLAY NAME</label>
              <input
                id="displayName"
                className="join-input-field"
                placeholder="Enter your name..."
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={50}
                required
                autoFocus
              />
            </div>

            {tab === 'create' ? (
              <div className="form-input-group">
                <label className="form-label-mono">PROGRAMMING LANGUAGE</label>
                <LangSlider selected={language} onSelect={setLanguage} />
                <div className="slider-helper-text">&larr; drag or click arrows &rarr;</div>
              </div>
            ) : (
              <div className="form-input-group">
                <label className="form-label-mono" htmlFor="roomId">ROOM ID</label>
                <input
                  id="roomId"
                  className="join-input-field mono"
                  placeholder="Paste room ID..."
                  value={roomIdInput}
                  onChange={e => setRoomIdInput(e.target.value)}
                  required={tab === 'join'}
                />
                <span className="join-hint">Ask the room creator to share their Room ID</span>
              </div>
            )}

            {error && (
              <div className="error-badge-mini">
                {error}
              </div>
            )}

            <button
              id={tab === 'create' ? 'btn-create-room' : 'btn-join-room'}
              type="submit"
              className="join-primary-btn"
              disabled={loading || !displayName.trim()}
            >
              {loading ? (
                <>{tab === 'create' ? 'CREATING...' : 'JOINING...'}</>
              ) : (
                tab === 'create' ? 'CREATE ROOM' : 'JOIN ROOM'
              )}
            </button>
          </form>
        </div>

        <div className="join-footer-simple">
          Rooms expire 2 hours after the last user leaves &middot; No account needed
        </div>
      </div>
    </div>
  );
}
