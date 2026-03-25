using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace CodeCollab.API.Hubs;

/// <summary>
/// SignalR hub that relays Yjs binary updates between peers and manages cursor presence.
/// </summary>
public class CollabHub : Hub
{
    private static readonly ConcurrentDictionary<string, HashSet<string>> RoomConnections = new();
    private static readonly ConcurrentDictionary<string, UserInfo> ConnectionUsers = new();

    private readonly Services.RoomService _roomService;
    private readonly ILogger<CollabHub> _logger;

    public CollabHub(Services.RoomService roomService, ILogger<CollabHub> logger)
    {
        _roomService = roomService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var roomIdRaw = Context.GetHttpContext()?.Request.Query["roomId"].ToString();
        var roomId = roomIdRaw?.ToLowerInvariant(); 
        var displayName = Context.GetHttpContext()?.Request.Query["displayName"].ToString() ?? "Anonymous";
        var color = Context.GetHttpContext()?.Request.Query["color"].ToString() ?? "#6366f1";
        var sessionId = Context.GetHttpContext()?.Request.Query["sessionId"].ToString() ?? Context.ConnectionId;

        if (string.IsNullOrEmpty(roomId) || !Guid.TryParse(roomId, out var roomGuid))
        {
            Context.Abort();
            return;
        }

        if (!await _roomService.RoomExistsAsync(roomGuid))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        RoomConnections.AddOrUpdate(roomId,
            _ => new HashSet<string> { Context.ConnectionId },
            (_, set) => { lock (set) { set.Add(Context.ConnectionId); } return set; });

        ConnectionUsers[Context.ConnectionId] = new UserInfo(sessionId, displayName, color, roomId);

        await _roomService.TouchRoomAsync(roomGuid);
        var room = await _roomService.GetRoomAsync(roomGuid);

        _logger.LogInformation("User {DisplayName} ({ConnectionId}) joining Room {RoomId}", displayName, Context.ConnectionId, roomId);
        await Clients.OthersInGroup(roomId).SendAsync("UserJoined", new
        {
            sessionId,
            displayName,
            color,
            connectionId = Context.ConnectionId
        });

        // Send current users list to newly connected user (filtered to 1 per sessionId)
        var currentUsers = RoomConnections.GetValueOrDefault(roomId, new())
            .Where(cid => cid != Context.ConnectionId && ConnectionUsers.ContainsKey(cid))
            .GroupBy(cid => ConnectionUsers[cid].SessionId)
            .Select(g => {
                var latestCid = g.First();
                return new
                {
                    connectionId = latestCid,
                    sessionId = ConnectionUsers[latestCid].SessionId,
                    displayName = ConnectionUsers[latestCid].DisplayName,
                    color = ConnectionUsers[latestCid].Color
                };
            }).ToList();

        await Clients.Caller.SendAsync("RoomUsers", currentUsers);

        // Initial state sync: Send the latest code snapshot to the caller
        var latestCode = await _roomService.GetLatestSnapshotAsync(roomGuid);
        if (!string.IsNullOrEmpty(latestCode))
        {
            await Clients.Caller.SendAsync("CodeChangeReceived", latestCode);
        }

        if (room != null)
        {
            await Clients.Caller.SendAsync("RoomLanguageReceived", room.Language);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectionUsers.TryRemove(Context.ConnectionId, out var user))
        {
            var roomId = user.RoomId.ToLowerInvariant();
            if (RoomConnections.TryGetValue(roomId, out var set))
            {
                lock (set) { set.Remove(Context.ConnectionId); }
                await Clients.OthersInGroup(roomId).SendAsync("UserLeft", new
                {
                    connectionId = Context.ConnectionId,
                    sessionId = user.SessionId,
                    displayName = user.DisplayName
                });

                if (set.Count == 0)
                {
                    if (Guid.TryParse(roomId, out var roomGuid))
                        await _roomService.MarkRoomEmptyAsync(roomGuid);
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>Relay a manual code update to all other peers in the room.</summary>
    public async Task SendCodeChange(string roomId, string code)
    {
        // Broadcast to room excluding the sender
        await Clients.OthersInGroup(roomId.ToLowerInvariant()).SendAsync("CodeChangeReceived", code);
        
        // Background: Save snapshot for persistence (optional but good for sync)
        if (Guid.TryParse(roomId, out var roomGuid))
            await _roomService.SaveSnapshotAsync(roomGuid, code);
    }

    /// <summary>Relay a Yjs binary update to other peers in the room.</summary>
    public async Task SendYjsUpdate(string roomId, byte[] update)
    {
        // Broadcast ONLY to others in the same room group
        await Clients.OthersInGroup(roomId.ToLowerInvariant()).SendAsync("ReceiveYjsUpdate", update);
    }

    /// <summary>Relay a combined cursor and selection update to all other peers.</summary>
    public async Task SendCursorChange(string roomId, object cursorData)
    {
        if (!ConnectionUsers.TryGetValue(Context.ConnectionId, out var user)) return;
        
        // Broadcast to room excluding the sender
        await Clients.OthersInGroup(roomId.ToLowerInvariant()).SendAsync("CursorChangeReceived", new
        {
            connectionId = Context.ConnectionId,
            sessionId = user.SessionId,
            displayName = user.DisplayName,
            color = user.Color,
            data = cursorData
        });
    }

    /// <summary>Relay cursor position to all peers.</summary>
    public async Task UpdateCursor(string roomId, int line, int column)
    {
        if (!ConnectionUsers.TryGetValue(Context.ConnectionId, out var user)) return;
        await Clients.OthersInGroup(roomId.ToLowerInvariant()).SendAsync("CursorMoved", new
        {
            connectionId = Context.ConnectionId,
            sessionId = user.SessionId,
            displayName = user.DisplayName,
            color = user.Color,
            line,
            column
        });
    }

    /// <summary>Relay selection range to all peers.</summary>
    public async Task UpdateSelection(string roomId, object selection)
    {
        if (!ConnectionUsers.TryGetValue(Context.ConnectionId, out var user)) return;
        await Clients.OthersInGroup(roomId.ToLowerInvariant()).SendAsync("SelectionMoved", new
        {
            connectionId = Context.ConnectionId,
            sessionId = user.SessionId,
            displayName = user.DisplayName,
            color = user.Color,
            selection
        });
    }



    /// <summary>Relay full awareness state (selection, cursor) from Yjs awareness protocol.</summary>
    public async Task UpdateAwareness(string roomId, byte[] awarenessUpdate)
    {
        await Clients.OthersInGroup(roomId.ToLowerInvariant()).SendAsync("AwarenessUpdate", awarenessUpdate);
    }

    /// <summary>Send a chat message to all users in the room.</summary>
    [HubMethodName("send-message")]
    public async Task SendMessage(string message)
    {
        if (!ConnectionUsers.TryGetValue(Context.ConnectionId, out var user))
        {
            _logger.LogWarning("SendMessage: ConnectionId {ConnectionId} not found in ConnectionUsers", Context.ConnectionId);
            return;
        }
        
        _logger.LogInformation("Global SendMessage from {SenderName}: {Message}", user.DisplayName, message);

        // Broadcast to ALL other clients (Literal requirement: no roomId filtering)
        await Clients.Others.SendAsync("receive-message", new
        {
            id = Guid.NewGuid(),
            senderSessionId = user.SessionId,
            senderName = user.DisplayName,
            senderColor = user.Color,
            text = message,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>Sync file creation, deletion, or renaming across all users.</summary>
    public async Task BroadcastFileAction(string roomId, object action)
    {
        // action contains: { type: 'create'|'delete'|'rename', file: {...} }
        await Clients.OthersInGroup(roomId.ToLowerInvariant()).SendAsync("FileActionReceived", action);
    }

    /// <summary>Request other peers to send their full document state (sync fallback).</summary>
    public async Task RequestYjsState(string roomId)
    {
        await Clients.OthersInGroup(roomId.ToLowerInvariant()).SendAsync("StateRequestReceived", Context.ConnectionId);
    }

    /// <summary>Save a code snapshot periodically.</summary>
    public async Task SaveSnapshot(string roomId, string content)
    {
        if (Guid.TryParse(roomId, out var roomGuid))
            await _roomService.SaveSnapshotAsync(roomGuid, content);
    }

    /// <summary>Fetch the session history (snapshots) for the room.</summary>
    public async Task RequestSessionHistory(string roomId)
    {
        if (Guid.TryParse(roomId, out var roomGuid))
        {
            var history = await _roomService.GetHistoryAsync(roomGuid);
            await Clients.Caller.SendAsync("HistoryReceived", history.Select(h => new {
                id = h.Id,
                savedAt = h.SavedAt,
                description = h.Content.Length > 20 ? "Auto-save" : h.Content
            }));
        }
    }

    /// <summary>Restore a specific snapshot state across all room members.</summary>
    public async Task RestoreSnapshot(string roomId, long snapshotId)
    {
        // For simplicity, we broadcast the snapshot content as a CodeChange update.
        // In a more complex Yjs setup, this would be a Yjs doc update.
        // But since our snapshots are currently JSON strings of files, we relay that.
        var history = await _roomService.GetHistoryAsync(new Guid(roomId));
        var snapshot = history.FirstOrDefault(h => h.Id == snapshotId);
        if (snapshot != null)
        {
            await Clients.Group(roomId.ToLowerInvariant()).SendAsync("SnapshotRestored", snapshot.Content);
        }
    }

    private record UserInfo(string SessionId, string DisplayName, string Color, string RoomId);
}
