using CodeCollab.API.Data;
using CodeCollab.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CodeCollab.API.Services;

public class RoomService
{
    private readonly AppDbContext _db;
    private readonly ILogger<RoomService> _logger;

    public RoomService(AppDbContext db, ILogger<RoomService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<Room> CreateRoomAsync(string language, CancellationToken ct = default)
    {
        var room = new Room
        {
            Language = language,
            CreatedAt = DateTime.UtcNow,
            LastActiveAt = DateTime.UtcNow
        };
        _db.Rooms.Add(room);
        await _db.SaveChangesAsync(ct);
        return room;
    }

    public async Task<Room?> GetRoomAsync(Guid roomId, CancellationToken ct = default)
    {
        return await _db.Rooms.FirstOrDefaultAsync(r => r.Id == roomId, ct);
    }

    public async Task<bool> RoomExistsAsync(Guid roomId, CancellationToken ct = default)
    {
        return await _db.Rooms.AnyAsync(r => r.Id == roomId, ct);
    }

    public async Task TouchRoomAsync(Guid roomId, CancellationToken ct = default)
    {
        var room = await _db.Rooms.FindAsync(new object[] { roomId }, ct);
        if (room != null)
        {
            room.LastActiveAt = DateTime.UtcNow;
            room.ExpiresAt = null; // Reset expiry when someone is active
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task MarkRoomEmptyAsync(Guid roomId, CancellationToken ct = default)
    {
        var room = await _db.Rooms.FindAsync(new object[] { roomId }, ct);
        if (room != null)
        {
            room.ExpiresAt = DateTime.UtcNow.AddHours(2); // 2h TTL after last user leaves
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<Session> CreateSessionAsync(Guid roomId, string displayName, string color, CancellationToken ct = default)
    {
        var session = new Session
        {
            RoomId = roomId,
            DisplayName = displayName,
            Color = color,
            JoinedAt = DateTime.UtcNow
        };
        _db.Sessions.Add(session);
        await _db.SaveChangesAsync(ct);
        return session;
    }

    public async Task SaveSnapshotAsync(Guid roomId, string content, CancellationToken ct = default)
    {
        _db.CodeSnapshots.Add(new CodeSnapshot
        {
            RoomId = roomId,
            Content = content,
            SavedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task<string?> GetLatestSnapshotAsync(Guid roomId, CancellationToken ct = default)
    {
        return await _db.CodeSnapshots
            .Where(s => s.RoomId == roomId)
            .OrderByDescending(s => s.SavedAt)
            .Select(s => s.Content)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<List<CodeSnapshot>> GetHistoryAsync(Guid roomId, int limit = 20, CancellationToken ct = default)
    {
        return await _db.CodeSnapshots
            .Where(s => s.RoomId == roomId)
            .OrderByDescending(s => s.SavedAt)
            .Take(limit)
            .ToListAsync(ct);
    }

    /// <summary>Cleanup rooms that have expired (called by background service)</summary>
    public async Task CleanupExpiredRoomsAsync(CancellationToken ct = default)
    {
        var expired = await _db.Rooms
            .Where(r => r.ExpiresAt.HasValue && r.ExpiresAt < DateTime.UtcNow)
            .ToListAsync(ct);

        _db.Rooms.RemoveRange(expired);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Cleaned up {Count} expired rooms", expired.Count);
    }
}
