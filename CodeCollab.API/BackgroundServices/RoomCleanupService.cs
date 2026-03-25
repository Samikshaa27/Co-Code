using CodeCollab.API.Services;

namespace CodeCollab.API.BackgroundServices;

/// <summary>Runs every 15 minutes to purge expired rooms from the database.</summary>
public class RoomCleanupService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<RoomCleanupService> _logger;

    public RoomCleanupService(IServiceProvider services, ILogger<RoomCleanupService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
            try
            {
                using var scope = _services.CreateScope();
                var roomService = scope.ServiceProvider.GetRequiredService<RoomService>();
                await roomService.CleanupExpiredRoomsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Room cleanup failed");
            }
        }
    }
}
