using Microsoft.AspNetCore.Mvc;

using Microsoft.AspNetCore.Hosting;
namespace Zity.Areas.Alcalde.Controllers
{
    // === ATRIBUTOS CRÍTICOS PARA DESAMBIGUACIÓN ===
    [Area("Alcalde")] // Identifica que pertenece al Área 'Alcalde'.
    [Route("Alcalde/[controller]/[action]/{id?}")] // Define la plantilla de ruta única.
    public class HomeController : Controller
    {
        private readonly IWebHostEnvironment _env;
        public HomeController(IWebHostEnvironment env) => _env = env;

        [Route("~/Alcalde")] // Atajo para acceder a /Alcalde
        [Route("Index")]     // Atajo para acceder a /Alcalde/Home/Index

        public IActionResult Index()
        {
            // Aquí iría la vista del Dashboard del Alcalde.
            // Asegúrate de tener un archivo en /Areas/Alcalde/Views/Home/Index.cshtml
            return View();
        }
        // GET: /User/Home/Eventos
        public IActionResult Eventos() => View();

        // GET: /User/Home/Incidencias
        public IActionResult Incidencias() => View();

        // POST: /User/Home/UploadArchivo
        [HttpPost]
        public async Task<IActionResult> UploadArchivo(IFormFile? foto)
        {
            if (foto == null || foto.Length == 0)
                return Json(new { ok = false, message = "No se recibió archivo." });

            // Carpeta física en wwwroot/Uploads (sirve archivos estáticos)
            var uploadsRoot = Path.Combine(_env.WebRootPath, "Uploads");
            if (!Directory.Exists(uploadsRoot)) Directory.CreateDirectory(uploadsRoot);

            // Nombre único
            var ext = Path.GetExtension(foto.FileName);
            var name = $"{Guid.NewGuid():N}{ext}";
            var fullPath = Path.Combine(uploadsRoot, name);

            using (var fs = new FileStream(fullPath, FileMode.Create))
                await foto.CopyToAsync(fs);

            // URL pública
            var url = Url.Content($"~/Uploads/{name}");
            return Json(new { ok = true, url });
        }
    }
}