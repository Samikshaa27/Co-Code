using Microsoft.EntityFrameworkCore;
using CodeCollab.API.Models;

namespace CodeCollab.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<CodeSnapshot> CodeSnapshots => Set<CodeSnapshot>();
    public DbSet<AiLog> AiLogs => Set<AiLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Room>(e =>
        {
            e.HasKey(r => r.Id);
        });

        modelBuilder.Entity<Session>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.Room)
             .WithMany(r => r.Sessions)
             .HasForeignKey(s => s.RoomId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CodeSnapshot>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).ValueGeneratedOnAdd();
            e.HasOne(c => c.Room)
             .WithMany(r => r.CodeSnapshots)
             .HasForeignKey(c => c.RoomId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AiLog>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).ValueGeneratedOnAdd();
            e.HasOne(a => a.Room)
             .WithMany(r => r.AiLogs)
             .HasForeignKey(a => a.RoomId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
