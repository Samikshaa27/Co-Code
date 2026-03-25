using Microsoft.AspNetCore.Mvc;
using CodeCollab.API.Services;

namespace CodeCollab.API.Controllers;

[ApiController]
[Route("api/rooms")]
public class RoomsController : ControllerBase
{
    private readonly RoomService _roomService;

    public RoomsController(RoomService roomService)
    {
        _roomService = roomService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Language))
            return BadRequest("Language is required.");

        var room = await _roomService.CreateRoomAsync(request.Language, ct);
        return Ok(new { roomId = room.Id, language = room.Language, createdAt = room.CreatedAt });
    }

    [HttpGet("{roomId}")]
    public async Task<IActionResult> GetRoom(Guid roomId, CancellationToken ct)
    {
        var room = await _roomService.GetRoomAsync(roomId, ct);
        if (room == null) return NotFound();

        var snapshot = await _roomService.GetLatestSnapshotAsync(roomId, ct);
        return Ok(new
        {
            roomId = room.Id,
            language = room.Language,
            createdAt = room.CreatedAt,
            lastActiveAt = room.LastActiveAt,
            expiresAt = room.ExpiresAt,
            initialCode = snapshot ?? ""
        });
    }
}

public record CreateRoomRequest(string Language);
