using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Zity.Models
{
    [Table("Roles", Schema = "dbo")]
    public class Rol
    {
        [Key] public int id_rol { get; set; }
        [Required] public string nombre_rol { get; set; } = null!;
        public string? descripcion { get; set; }
    }
}
