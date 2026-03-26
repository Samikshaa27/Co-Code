using CodeCollab.API.Data;
using CodeCollab.API.Hubs;
using CodeCollab.API.Services;
using CodeCollab.API.BackgroundServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Check for API Key at startup
var apiKey = builder.Configuration["Groq:ApiKey"] ?? builder.Configuration["OpenAI:ApiKey"];
if (string.IsNullOrEmpty(apiKey))
{
    Console.WriteLine("CRITICAL: AI API Key (Groq or OpenAI) is missing!");
    throw new InvalidOperationException("API key not configured (required for AI features).");
}
Console.WriteLine("AI Backend Startup: API Key found.");

// ── Database ──────────────────────────────────────────────────────────────────
var dbProvider = builder.Configuration["DatabaseProvider"] ?? "Sqlite";
var rawConn = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? (dbProvider == "Postgres" ? "Host=localhost;Database=codecollab;Username=postgres" : "Data Source=codecollab.db");

var connectionString = rawConn;
if (dbProvider.Equals("Postgres", StringComparison.OrdinalIgnoreCase) && rawConn.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
{
    try 
    {
        var uri = new Uri(rawConn);
        var userInfo = uri.UserInfo.Split(':');
        var user = userInfo[0];
        var pass = userInfo.Length > 1 ? userInfo[1] : "";
        var host = uri.Host;
        var dbPort = uri.Port > 0 ? uri.Port : 5432;
        var db = uri.AbsolutePath.TrimStart('/');
        var ssl = rawConn.Contains("sslmode=require") ? "SSL Mode=Require;Trust Server Certificate=true" : "";
        
        connectionString = $"Host={host};Port={dbPort};Database={db};Username={user};Password={pass};{ssl}";
    }
    catch (Exception ex)
    {
        Console.WriteLine($"WARNING: Failed to parse Postgres URI: {ex.Message}");
    }
}

builder.Services.AddDbContext<AppDbContext>(opts =>
{
    if (dbProvider.Equals("Postgres", StringComparison.OrdinalIgnoreCase))
        opts.UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure(3));
    else
        opts.UseSqlite(connectionString);
});

// ── Authentication ────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"] ?? "super-secret-dev-key-change-in-production-32c";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidIssuer = "codecollab",
            ValidAudience = "codecollab",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(5)
        };
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var access = ctx.Request.Query["access_token"];
                var path = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(access) && path.StartsWithSegments("/hubs"))
                    ctx.Token = access;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.AddScoped<RoomService>();
builder.Services.AddScoped<AiService>();
builder.Services.AddHostedService<RoomCleanupService>();

// ── SignalR ───────────────────────────────────────────────────────────────────
builder.Services.AddSignalR(opts =>
{
    opts.MaximumReceiveMessageSize = 5 * 1024 * 1024;
    opts.EnableDetailedErrors = builder.Environment.IsDevelopment();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opts =>
{
    opts.AddPolicy("ProductionCors", policy =>
    {
        policy.WithOrigins("https://co-code-ai.vercel.app")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ── Migrate & seed ────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        log.LogError(ex, "Migration failed — continuing anyway");
    }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseCors("ProductionCors");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<CollabHub>("/hubs/collab");

app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

var port = Environment.GetEnvironmentVariable("PORT") ?? "5099";
app.Run($"http://0.0.0.0:{port}");
