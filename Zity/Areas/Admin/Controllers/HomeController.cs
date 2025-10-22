using Microsoft.AspNetCore.Mvc;

namespace Zity.Areas.Admin.Controllers
{
    [Area("Admin")] // Le dice que pertenece al Área 'Admin'
    [Route("Admin/Home")] // <-- LA CLAVE: Define la ruta base para este controlador
    public class HomeController : Controller
    {
        [Route("")]       // Responde a /Admin/Home
        [Route("Index")]  // Responde a /Admin/Home/Index
        public IActionResult Index()
        {
            return View();
        }
    }
}