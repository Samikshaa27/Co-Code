using System.Text;
using System.Text.Json;
using CodeCollab.API.Data;
using CodeCollab.API.Models;
using OpenAI;
using OpenAI.Chat;
using System.ClientModel;

namespace CodeCollab.API.Services;

public record AiSuggestionResult(string Suggestion, bool Success, string? Error = null);
public record AiExplainResult(string Explanation, bool Success, string? Error = null);
public record DebugIssue(int Line, string Message, string Severity, string Fix);
public record AiDebugResult(List<DebugIssue> Issues, bool Success, string? Error = null);
public record AiDeepDebugResult(string RootCause, string Analysis, List<string> Fixes, bool Success, string? Error = null);

public class AiService
{
    private readonly AppDbContext _db;
    private readonly ILogger<AiService> _logger;
    private readonly IConfiguration _config;
    private readonly string _apiKey;
    
    // Models as requested
    private const string SuggestionModel = "gpt-4o-mini";
    private const string AnalysisModel = "gpt-4o";

    public AiService(AppDbContext db, ILogger<AiService> logger, IConfiguration config)
    {
        _db = db;
        _logger = logger;
        _config = config;
        _apiKey = config["Groq:ApiKey"] ?? config["OpenAI:ApiKey"] ?? "";
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogCritical("OpenAI API Key is missing. AI features will fail.");
        }
        _db = db;
        _logger = logger;
    }

    private ChatClient GetChatClient(string model)
    {
        if (string.IsNullOrEmpty(_apiKey)) throw new InvalidOperationException("AI Service: API key is not configured.");
        
        // FORCE Groq for now to bypass detection confusion
        bool isGroq = true;

        if (isGroq)
        {
             var options = new OpenAIClientOptions { Endpoint = new Uri("https://api.groq.com/openai/v1") };
             var client = new OpenAIClient(new ApiKeyCredential(_apiKey), options);
             
             // Map standard models to Groq equivalents
             string groqModel = model.Contains("mini") ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
             return client.GetChatClient(groqModel);
        }
        
        return new OpenAIClient(new ApiKeyCredential(_apiKey)).GetChatClient(model);
    }

    private string GetSystemPrompt(string mode, string language)
    {
        var role = $"You are an expert {language} developer. Mode: {mode}. ";
        return mode switch
        {
            "Suggest" => role + "Analyze code and suggest improvement. ONLY suggestion text, 1-2 sentences. No markdown headers.",
            "Explain" => role + "Explain code explicitly in markdown. Cover what it does, logic, and potential issues.",
            "Debug" => role + "Static code analyzer. ONLY raw JSON array: [{\"line\":int, \"message\":string, \"severity\":\"error\"|\"warning\"|\"info\", \"fix\":string}]. No other text.",
            "Deep Debug" => role + "Senior debugger. Output ONLY RAW JSON: {\"rootCause\":string, \"analysis\":string (markdown), \"fixes\":string[]}. No explanation prefix.",
            _ => role + "Respond concisely."
        };
    }

    private async Task LogTelemetryAsync(Guid roomId, string callType, string model, int tokens)
    {
        try 
        {
            _db.AiLogs.Add(new AiLog
            {
                RoomId = roomId, 
                CallType = callType, 
                Model = model, 
                TokensUsed = tokens, 
                CalledAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Telemetry: Failed to log AI call for room {RoomId}", roomId);
        }
    }

    public async Task<AiSuggestionResult> GetSuggestionAsync(Guid roomId, string code, string language, CancellationToken ct = default)
    {
        try
        {
            var client = GetChatClient(SuggestionModel);
            var messages = new List<ChatMessage> {
                new SystemChatMessage(GetSystemPrompt("Suggest", language)),
                new UserChatMessage($"Code:\n```{language}\n{TruncateCode(code)}\n```")
            };

            ChatCompletion completion = await client.CompleteChatAsync(messages, cancellationToken: ct);
            var text = completion.Content[0].Text;
            
            await LogTelemetryAsync(roomId, "suggestion", SuggestionModel, completion.Usage.TotalTokenCount);
            return new AiSuggestionResult(text, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI Suggestion failure");
            // MASKED DIAGNOSTIC: See what key we're actually sending (first 5 chars)
            string masked = string.IsNullOrEmpty(_apiKey) ? "MISSING" : _apiKey.Length > 5 ? _apiKey[..5] + "..." : "TOO_SHORT";
            return new AiSuggestionResult("", false, $"[{masked}] {ex.Message}");
        }
    }

    public async IAsyncEnumerable<string> GetExplanationStreamAsync(Guid roomId, string code, string language, string? selectedCode = null, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        ChatClient? client = null;
        string? error = null;
        try
        {
            client = GetChatClient(AnalysisModel);
        }
        catch (Exception ex)
        {
            error = $"[ERROR]: {ex.Message}";
        }

        if (error != null)
        {
            yield return error;
            yield break;
        }

        var messages = new List<ChatMessage> {
            new SystemChatMessage(GetSystemPrompt("Explain", language)),
            new UserChatMessage($"Explain this {language} code:\n```\n{TruncateCode(selectedCode ?? code)}\n```")
        };

        AsyncCollectionResult<StreamingChatCompletionUpdate> updates = client!.CompleteChatStreamingAsync(messages, cancellationToken: ct);
        
        var fullText = new StringBuilder();
        await foreach (StreamingChatCompletionUpdate update in updates)
        {
            foreach (ChatMessageContentPart part in update.ContentUpdate)
            {
                if (!string.IsNullOrEmpty(part.Text))
                {
                    fullText.Append(part.Text);
                    yield return part.Text;
                }
            }
        }

        try
        {
             // We don't have usage in streaming until the end usually, or we can approximate
             await LogTelemetryAsync(roomId, "explain_stream", AnalysisModel, (fullText.Length / 4) + 50); 
        }
        catch { /* ignored */ }
    }

    public async Task<AiExplainResult> GetExplanationAsync(Guid roomId, string code, string language, string? selectedCode = null, CancellationToken ct = default)
    {
        try
        {
            var client = GetChatClient(AnalysisModel);
            var messages = new List<ChatMessage> {
                new SystemChatMessage(GetSystemPrompt("Explain", language)),
                new UserChatMessage($"Explain this {language} code:\n```\n{TruncateCode(selectedCode ?? code)}\n```")
            };

            ChatCompletion completion = await client.CompleteChatAsync(messages, cancellationToken: ct);
            var text = completion.Content[0].Text;
            
            await LogTelemetryAsync(roomId, "explain", AnalysisModel, completion.Usage.TotalTokenCount);
            return new AiExplainResult(text, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI Explain failure");
            return new AiExplainResult("", false, ex.Message);
        }
    }

    public async Task<AiDebugResult> GetDebugFlagsAsync(Guid roomId, string code, string language, CancellationToken ct = default)
    {
        try
        {
            var client = GetChatClient(SuggestionModel);
            var messages = new List<ChatMessage> {
                new SystemChatMessage(GetSystemPrompt("Debug", language)),
                new UserChatMessage($"Analyze:\n```\n{TruncateCode(code)}\n```")
            };

            ChatCompletion completion = await client.CompleteChatAsync(messages, cancellationToken: ct);
            var text = completion.Content[0].Text;
            
            await LogTelemetryAsync(roomId, "debug", SuggestionModel, completion.Usage.TotalTokenCount);
            return new AiDebugResult(ParseDebugIssues(text), true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI Debug failure");
            return new AiDebugResult(new(), false, ex.Message);
        }
    }

    public async Task<AiDeepDebugResult> GetDeepDebugAsync(Guid roomId, string code, string language, CancellationToken ct = default)
    {
        try
        {
            var client = GetChatClient(AnalysisModel);
            var messages = new List<ChatMessage> {
                new SystemChatMessage(GetSystemPrompt("Deep Debug", language)),
                new UserChatMessage($"Deep debug this code:\n```\n{TruncateCode(code)}\n```")
            };

            ChatCompletion completion = await client.CompleteChatAsync(messages, cancellationToken: ct);
            var text = completion.Content[0].Text;
            
            await LogTelemetryAsync(roomId, "deepdebug", AnalysisModel, completion.Usage.TotalTokenCount);
            return ParseDeepDebug(text);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI DeepDebug failure");
            return new AiDeepDebugResult("","",new(), false, ex.Message);
        }
    }

    private static string TruncateCode(string code, int max = 2000) => code.Length <= max ? code : code[..max] + "\n//... truncated";

    private static List<DebugIssue> ParseDebugIssues(string j)
    {
        try {
            var raw = j.Replace("```json","").Replace("```","").Trim();
            var el = JsonSerializer.Deserialize<List<JsonElement>>(raw);
            return el?.Select(e => new DebugIssue(
                e.TryGetProperty("line", out var l) ? l.GetInt32() : 1,
                e.TryGetProperty("message", out var m) ? m.GetString()??"" : "",
                e.TryGetProperty("severity", out var s) ? s.GetString()??"warning" : "warning",
                e.TryGetProperty("fix", out var f) ? f.GetString()??"" : ""
            )).ToList() ?? new();
        } catch { return new(); }
    }

    private static AiDeepDebugResult ParseDeepDebug(string j)
    {
        try {
            var raw = j.Replace("```json","").Replace("```","").Trim();
            var el = JsonSerializer.Deserialize<JsonElement>(raw);
            return new AiDeepDebugResult(
                el.TryGetProperty("rootCause", out var rc) ? rc.GetString()??"" : "",
                el.TryGetProperty("analysis", out var a) ? a.GetString()??"" : "",
                el.TryGetProperty("fixes", out var f) && f.ValueKind == JsonValueKind.Array ? f.EnumerateArray().Select(x=>x.GetString()??"").ToList() : new(),
                true
            );
        } catch { return new AiDeepDebugResult("Parse Error", j, new(), true); }
        }
}
