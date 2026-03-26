using Microsoft.AspNetCore.Mvc;
using CodeCollab.API.Services;
using System.Text.Json;

namespace CodeCollab.API.Controllers;

[ApiController]
[Route("ai")]
public class AiController : ControllerBase
{
    private readonly AiService _aiService;
    private readonly ILogger<AiController> _logger;

    public AiController(AiService aiService, ILogger<AiController> logger)
    {
        _aiService = aiService;
        _logger = logger;
    }

    [HttpPost("suggest")]
    public async Task<IActionResult> Suggest([FromBody] AiRequest request, CancellationToken ct)
    {
        try 
        {
            if (!Validate(request, out var error)) return BadRequest(new { error });
            var result = await _aiService.GetSuggestionAsync(request.RoomId, request.Code, request.Language, ct);
            if (!result.Success) 
            {
                 // Handle specific API key/Quota errors gracefully
                if (result.Error?.Contains("401") == true || result.Error?.Contains("429") == true)
                    return BadRequest(new { error = $"AI Service credential issue. Check API Key on Render. Detail: {result.Error}" });
                
                return StatusCode(500, new { error = result.Error });
            }
            return Ok(new { suggestion = result.Suggestion });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AiController.Suggest Error");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("explain")]
    public async Task Explain([FromBody] AiExplainRequest request, CancellationToken ct)
    {
        if (!Validate(request, out var error))
        {
            Response.StatusCode = 400;
            await Response.WriteAsJsonAsync(new { error }, ct);
            return;
        }

        Response.ContentType = "text/event-stream";
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        try
        {
            var stream = _aiService.GetExplanationStreamAsync(request.RoomId, request.Code, request.Language, request.SelectedCode, ct);
            await foreach (var chunk in stream)
            {
                await Response.WriteAsync(chunk, ct);
                await Response.Body.FlushAsync(ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AiController.Explain Streaming Error");
            // If we already started streaming, we can't change the status code.
            // But we can write an error message.
            await Response.WriteAsync($"\n\n[ERROR]: {ex.Message}", ct);
        }
    }

    [HttpPost("debug")]
    public async Task<IActionResult> Debug([FromBody] AiRequest request, CancellationToken ct)
    {
        try
        {
            if (!Validate(request, out var error)) return BadRequest(new { error });
            var result = await _aiService.GetDebugFlagsAsync(request.RoomId, request.Code, request.Language, ct);
            if (!result.Success)
            {
                if (result.Error?.Contains("401") == true || result.Error?.Contains("429") == true)
                    return BadRequest(new { error = $"AI Service unavailable. Check API Key on Render. Detail: {result.Error}" });
                return StatusCode(500, new { error = result.Error });
            }
            return Ok(new { issues = result.Issues });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AiController.Debug Error");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("deepdebug")]
    public async Task<IActionResult> DeepDebug([FromBody] AiRequest request, CancellationToken ct)
    {
        try
        {
            if (!Validate(request, out var error)) return BadRequest(new { error });
            var result = await _aiService.GetDeepDebugAsync(request.RoomId, request.Code, request.Language, ct);
            if (!result.Success)
            {
                if (result.Error?.Contains("401") == true || result.Error?.Contains("429") == true)
                    return BadRequest(new { error = $"AI Service credential issue. Check API Key on Render. Detail: {result.Error}" });
                return StatusCode(500, new { error = result.Error });
            }
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AiController.DeepDebug Error");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private static bool Validate(AiRequest request, out string error)
    {
        if (request.RoomId == Guid.Empty) { error = "Invalid room ID."; return false; }
        if (string.IsNullOrWhiteSpace(request.Code)) { error = "Code is required."; return false; }
        if (string.IsNullOrWhiteSpace(request.Language)) { error = "Language is required."; return false; }
        if (request.Code.Length > 10 * 1024) { error = "Code too long (max 10KB)."; return false; }
        error = "";
        return true;
    }
}

public record AiRequest(Guid RoomId, string Code, string Language);
public record AiExplainRequest(Guid RoomId, string Code, string Language, string? SelectedCode) : AiRequest(RoomId, Code, Language);
