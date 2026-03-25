using CodeCollab.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace CodeCollab.API;

/// <summary>
/// Allows 'dotnet ef migrations add' to run without a running database.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=codecollab.db")
            .Options;
        return new AppDbContext(opts);
    }
}
