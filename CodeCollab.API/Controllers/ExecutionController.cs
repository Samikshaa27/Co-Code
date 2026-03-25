using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Text;

namespace CodeCollab.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExecutionController : ControllerBase
{
    private readonly ILogger<ExecutionController> _logger;

    public ExecutionController(ILogger<ExecutionController> logger)
    {
        _logger = logger;
    }

    [HttpPost("run")]
    public async Task<IActionResult> RunCode([FromBody] RunRequest request)
    {
        if (string.IsNullOrEmpty(request.Code))
            return BadRequest("Code cannot be empty.");

        try
        {
            var result = await ExecuteAsync(request.Language, request.Code);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Execution failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private async Task<RunResult> ExecuteAsync(string language, string code)
    {
        // In a real production app, use a real sandbox like Docker or WASM.
        // For this demo, we'll use a controlled local process execution.
        
        string fileName = "";
        string args = "";
        string tempFile = Path.Combine(Path.GetTempPath(), $"code_{Guid.NewGuid()}");

        switch (language.ToLower())
        {
            case "javascript":
                fileName = "node";
                tempFile += ".js";
                await System.IO.File.WriteAllTextAsync(tempFile, code);
                args = $"\"{tempFile}\"";
                break;
            case "python":
                fileName = "python";
                tempFile += ".py";
                await System.IO.File.WriteAllTextAsync(tempFile, code);
                args = $"\"{tempFile}\"";
                break;
            default:
                return new RunResult { Output = $"Execution for {language} is not yet supported in this sandbox.", ExitCode = -1 };
        }

        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = args,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = new Process { StartInfo = startInfo };
        var output = new StringBuilder();
        var error = new StringBuilder();

        process.OutputDataReceived += (s, e) => { if (e.Data != null) output.AppendLine(e.Data); };
        process.ErrorDataReceived += (s, e) => { if (e.Data != null) error.AppendLine(e.Data); };

        try {
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            var timeoutTask = Task.Delay(TimeSpan.FromSeconds(5));
            var exitTask = process.WaitForExitAsync();

            var completedTask = await Task.WhenAny(exitTask, timeoutTask);

            if (completedTask == exitTask)
            {
                return new RunResult 
                { 
                    Output = output.ToString(), 
                    Error = error.ToString(), 
                    ExitCode = process.ExitCode 
                };
            }
            else
            {
                process.Kill();
                return new RunResult { Output = "Execution timed out (5s limit).", ExitCode = -1 };
            }
        }
        finally {
            if (System.IO.File.Exists(tempFile)) System.IO.File.Delete(tempFile);
        }
    }

    public record RunRequest(string Language, string Code);
    public record RunResult { 
        public string Output { get; init; } = ""; 
        public string Error { get; init; } = ""; 
        public int ExitCode { get; init; } 
    }
}
