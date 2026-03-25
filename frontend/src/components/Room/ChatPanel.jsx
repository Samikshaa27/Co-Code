import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faAt } from '@fortawesome/free-solid-svg-icons';

export function ChatPanel({ sendChatMessage }) {
  const { chatMessages, sessionId, users } = useStore();
  const [msg, setMsg] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (msg.trim()) {
      sendChatMessage(msg.trim());
      setMsg('');
    }
  };

  // Helper to format timestamps
  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {chatMessages.map((m, i) => {
          const isMe = m.senderSessionId === sessionId;
          const showHeader = i === 0 || chatMessages[i - 1].senderSessionId !== m.senderSessionId;
          
          return (
            <div key={m.id} className={`chat-msg ${isMe ? 'me' : 'them'}`}>
              {showHeader && (
                <div className="msg-header" style={{ color: m.senderColor, textAlign: isMe ? 'right' : 'left' }}>
                  {isMe ? 'You' : m.senderName}
                </div>
              )}
              <div 
                className="msg-bubble" 
                style={{ 
                  borderLeft: `3px solid ${m.senderColor}`,
                  backgroundColor: isMe ? '#1c1c1c' : 'var(--bg-elevated)',
                  color: 'var(--text-primary)'
                }}
              >
                <span className="msg-text">{m.text}</span>
                <span className="msg-time">{formatTime(m.timestamp)}</span>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <div className="chat-input-wrapper">
          <input 
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button type="submit" className="chat-send-btn" disabled={!msg.trim()}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </button>
        </div>
      </form>
    </div>
  );
}
