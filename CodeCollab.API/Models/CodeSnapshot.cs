using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CodeCollab.API.Models;

[Table("code_snapshots")]
public class CodeSnapshot
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("room_id")]
    public Guid RoomId { get; set; }

    [ForeignKey("RoomId")]
    public Room Room { get; set; } = null!;

    [Column("content")]
    public string Content { get; set; } = string.Empty;

    [Column("saved_at")]
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
}
