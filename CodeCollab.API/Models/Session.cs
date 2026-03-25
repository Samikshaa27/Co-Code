using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CodeCollab.API.Models;

[Table("sessions")]
public class Session
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("room_id")]
    public Guid RoomId { get; set; }

    [ForeignKey("RoomId")]
    public Room Room { get; set; } = null!;

    [Column("display_name")]
    [MaxLength(100)]
    public string DisplayName { get; set; } = string.Empty;

    [Column("color")]
    [MaxLength(20)]
    public string Color { get; set; } = "#6366f1";

    [Column("joined_at")]
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
