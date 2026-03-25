using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CodeCollab.API.Services;

namespace CodeCollab.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly RoomService _roomService;

    public AuthController(IConfiguration config, RoomService roomService)
    {
        _config = config;
        _roomService = roomService;
    }

    [HttpPost("guest")]
    public async Task<IActionResult> GuestLogin([FromBody] GuestLoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            return BadRequest("Display name is required.");

        if (!Guid.TryParse(request.RoomId, out var roomGuid))
            return BadRequest("Invalid room ID.");

        if (!await _roomService.RoomExistsAsync(roomGuid, ct))
            return NotFound("Room not found.");

        var sessionId = Guid.NewGuid();
        var color = GenerateColor(request.DisplayName);

        // Create session in DB
        await _roomService.CreateSessionAsync(roomGuid, request.DisplayName, color, ct);

        var jwtKey = _config["Jwt:Key"] ?? "super-secret-dev-key-change-in-production-32c";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, sessionId.ToString()),
            new Claim("roomId", request.RoomId),
            new Claim("displayName", request.DisplayName),
            new Claim("color", color),
        };

        var token = new JwtSecurityToken(
            issuer: "codecollab",
            audience: "codecollab",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(4),
            signingCredentials: creds
        );

        var tokenStr = new JwtSecurityTokenHandler().WriteToken(token);

        return Ok(new
        {
            token = tokenStr,
            sessionId,
            displayName = request.DisplayName,
            color,
            roomId = request.RoomId
        });
    }

    private static string GenerateColor(string seed)
    {
        var colors = new[]
        {
            "#2E6FD9", "#0F6E56", "#D85A30", "#534AB7", "#BA7517", "#0D7A8A"
        };
        var idx = Math.Abs(seed.GetHashCode()) % colors.Length;
        return colors[idx];
    }
}

public record GuestLoginRequest(string DisplayName, string RoomId);
