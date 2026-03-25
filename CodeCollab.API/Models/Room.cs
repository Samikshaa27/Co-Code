using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CodeCollab.API.Models;

[Table("rooms")]
public class Room
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("last_active_at")]
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;

    [Column("language")]
    [MaxLength(50)]
    public string Language { get; set; } = "javascript";

    [Column("expires_at")]
    public DateTime? ExpiresAt { get; set; }

    public ICollection<Session> Sessions { get; set; } = new List<Session>();
    public ICollection<CodeSnapshot> CodeSnapshots { get; set; } = new List<CodeSnapshot>();
    public ICollection<AiLog> AiLogs { get; set; } = new List<AiLog>();
}
