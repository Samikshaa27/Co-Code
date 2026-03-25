import { useStore } from '../../store/useStore';

export function UsersPanel() {
  const { users, displayName, color, sessionId, cursors } = useStore();

  const selfUser = { sessionId, displayName, color, isSelf: true };
  const otherUsers = users.filter(u => u.sessionId !== sessionId);
  const allUsers = [selfUser, ...otherUsers];

  return (
    <div className="users-list">
      <div style={{ padding: '4px 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        {allUsers.length} participant{allUsers.length !== 1 ? 's' : ''} in this room
      </div>
      {allUsers.map(user => {
        const cursor = Object.values(cursors).find(c => c.sessionId === user.sessionId);
        return (
          <div key={user.sessionId} className="user-item">
            <div className="user-item-avatar" style={{ background: user.color }}>
              {user.displayName?.slice(0, 1).toUpperCase()}
            </div>
            <div className="user-item-info">
              <div className="user-item-name">
                {user.displayName} {user.isSelf && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(you)</span>}
              </div>
              <div className="user-item-status">
                <div className="user-online-dot" />
                Online
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
