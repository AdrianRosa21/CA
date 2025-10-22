using Microsoft.AspNetCore.Mvc;

using Microsoft.AspNetCore.Hosting;

namespace Zity.Areas.User.Controllers
{
    [Area("User")]
    public class HomeController : Controller
    {
        private readonly IWebHostEnvironment _env;
        public HomeController(IWebHostEnvironment env) => _env = env;

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
        // GET: /User/Home/Eventos
        public IActionResult Eventos() => View();

        public IActionResult Index()
        {
            return View();
        }




    }
}
