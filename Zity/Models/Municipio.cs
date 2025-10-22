using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Zity.Models
{
    [Table("Municipios", Schema = "dbo")]
    public class Municipio
    {
        [Key] public int id_municipio { get; set; }
        [Required] public string nombre_municipio { get; set; } = null!;
    }
}
