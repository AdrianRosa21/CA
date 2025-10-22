using Microsoft.EntityFrameworkCore;
using Zity.Models;

namespace Zity.Data
{
    public class ZityContext : DbContext
    {
        public ZityContext(DbContextOptions<ZityContext> options) : base(options) { }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Rol> Roles { get; set; }
        public DbSet<Municipio> Municipios { get; set; }  // <-- NECESARIO

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Usuario>().ToTable("Usuarios", schema: "dbo");
            modelBuilder.Entity<Rol>().ToTable("Roles", schema: "dbo");
            modelBuilder.Entity<Municipio>().ToTable("Municipios", schema: "dbo");
        }
    }
}
