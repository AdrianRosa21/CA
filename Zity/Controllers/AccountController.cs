using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Zity.Data;
using Zity.Models;
using Zity.Services;



namespace Zity.Controllers
{
    public class AccountController : Controller
    {
        private readonly ZityContext _context;
        public AccountController(ZityContext context) => _context = context;

        // ====== LOGIN ======
        [HttpGet]
        public IActionResult Login()
        {
            ViewData["HideNav"] = true;
            return View();
        }



        [HttpPost]
        public async Task<IActionResult> Login(string email, string password)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                ViewBag.ErrorMessage = "Completa correo y contraseña.";
                return View();
            }

            string hashed = ToSha256HexUpper(password);

            var user = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.correo_electronico == email && u.contraseña_hash == hashed);

            if (user == null)
            {
                ViewBag.ErrorMessage = "Correo o contraseña incorrectos.";
                return View();
            }

            // Cargar nombre del rol (1=usuario, 2=moderador, 3=administrador
            string rol = user.id_rol switch
            {
                1 => "usuario",
                2 => "administrador",
                3 => "alcalde",
                _ => "usuario"
            };


            // Guardar sesión
            HttpContext.Session.SetInt32("UserId", user.id_usuario);
            HttpContext.Session.SetString("UserEmail", user.correo_electronico);
            HttpContext.Session.SetString("UserName", $"{user.nombre} {user.apellido}");
            HttpContext.Session.SetInt32("UserRoleId", user.id_rol); // <-- CLAVE: 1=User, 2=Alcalde, 3=Admin

            return user.id_rol switch
            {
                3 => RedirectToAction("Index", "Home", new { area = "Alcalde" }),
                2 => RedirectToAction("Index", "Home", new { area = "Admin" }),
                _ => RedirectToAction("Index", "Home", new { area = "User" })
            };


        }


        [HttpGet]
        public async Task<IActionResult> Register()
        {
            string[] muniEste = new[] { "Soyapango", "Ilopango", "San Martín", "Tonacatepeque", "Ciudad Delgado" };

            ViewBag.MunicipiosEste = await _context.Municipios
                .Where(m => muniEste.Contains(m.nombre_municipio))
                .OrderBy(m => m.nombre_municipio)
                .ToListAsync();
            ViewData["HideNav"] = true;
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Register(
    string nombre,
    string apellido,
    DateTime? fecha_nacimiento,
    string email,
    string? telefono,
    int? id_municipio,   // ← Debe venir del <select>
    int? id_barrio,      // opcional
    string password,
    double? lat,
    double? lon)
        {
            // Recargar lista por si hay error y hay que re-renderizar la vista
            string[] muniEste = new[] { "Soyapango", "Ilopango", "San Martín", "Tonacatepeque", "Ciudad Delgado" };
            ViewBag.MunicipiosEste = await _context.Municipios
                .Where(m => muniEste.Contains(m.nombre_municipio))
                .OrderBy(m => m.nombre_municipio)
                .ToListAsync();

            // Validaciones básicas
            if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(apellido)
                || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                ViewBag.ErrorMessage = "Completa nombre, apellido, correo y contraseña.";
                return View();
            }

            if (!id_municipio.HasValue)
            {
                ViewBag.ErrorMessage = "Selecciona un municipio.";
                return View();
            }

            // Validar que el municipio existe y es del “Este”
            var muni = await _context.Municipios
                .Where(m => m.id_municipio == id_municipio.Value && muniEste.Contains(m.nombre_municipio))
                .FirstOrDefaultAsync();

            if (muni == null)
            {
                ViewBag.ErrorMessage = "El municipio seleccionado no es válido.";
                return View();
            }

            if (await _context.Usuarios.AnyAsync(u => u.correo_electronico == email))
            {
                ViewBag.ErrorMessage = "Ese correo ya está registrado.";
                return View();
            }

            var user = new Usuario
            {
                nombre = nombre.Trim(),
                apellido = apellido.Trim(),
                fecha_nacimiento = fecha_nacimiento,
                correo_electronico = email.Trim(),
                telefono = string.IsNullOrWhiteSpace(telefono) ? null : telefono.Trim(),
                id_municipio = id_municipio.Value, // ← GUARDA lo elegido
                id_barrio = id_barrio,             // puede quedar null
                contraseña_hash = ToSha256HexUpper(password),
                id_rol = 1,
                estado_cuenta = "activo",
                latitud = lat.HasValue ? (decimal?)Math.Round(Convert.ToDecimal(lat.Value, CultureInfo.InvariantCulture), 6) : null,
                longitud = lon.HasValue ? (decimal?)Math.Round(Convert.ToDecimal(lon.Value, CultureInfo.InvariantCulture), 6) : null
                // fecha_de_registro lo llena SQL con GETDATE()
            };

            _context.Usuarios.Add(user);
            await _context.SaveChangesAsync();

            TempData["SuccessMessage"] = lat.HasValue && lon.HasValue
                ? $"¡Registro exitoso! Ubicación: {lat.Value:F6}, {lon.Value:F6}."
                : "¡Registro exitoso!";

            return RedirectToAction("Login");
        }



        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction(nameof(Login));
        }

        // === Helpers ===
        private static string ToSha256HexUpper(string input)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
            var sb = new StringBuilder(bytes.Length * 2);
            foreach (var b in bytes) sb.Append(b.ToString("X2")); // HEX MAYÚSCULAS
            return sb.ToString();
        }




    }
}
