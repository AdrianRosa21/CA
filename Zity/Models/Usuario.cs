using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Zity.Models
{
    [Table("Usuarios", Schema = "dbo")]
    public class Usuario
    {
        [Key] public int id_usuario { get; set; }

        [Required] public string nombre { get; set; } = null!;
        [Required] public string apellido { get; set; } = null!;

        public DateTime? fecha_nacimiento { get; set; }

        [Required] public string correo_electronico { get; set; } = null!;
        public string? telefono { get; set; }

        public int? id_municipio { get; set; }
        public int? id_barrio { get; set; }

        [Required] public string contraseña_hash { get; set; } = null!;

        // SQL la rellena con GETDATE(); la marcamos como generada por BD
        [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
        public DateTime fecha_de_registro { get; set; }

        public int id_rol { get; set; } = 1;
        public string estado_cuenta { get; set; } = "activo";

        [Column(TypeName = "decimal(9,6)")] public decimal? latitud { get; set; }
        [Column(TypeName = "decimal(9,6)")] public decimal? longitud { get; set; }
    }
}