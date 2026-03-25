using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CodeCollab.API.Models;

[Table("ai_logs")]
public class AiLog
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("room_id")]
    public Guid RoomId { get; set; }

    [ForeignKey("RoomId")]
    public Room? Room { get; set; }

    [Column("call_type")]
    [MaxLength(50)]
    public string CallType { get; set; } = string.Empty;

    [Column("called_at")]
    public DateTime CalledAt { get; set; } = DateTime.UtcNow;

    [Column("model")]
    [MaxLength(50)]
    public string Model { get; set; } = string.Empty;

    [Column("tokens_used")]
    public int TokensUsed { get; set; }
}
