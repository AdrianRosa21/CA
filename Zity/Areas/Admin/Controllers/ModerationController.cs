using Microsoft.AspNetCore.Mvc;

namespace Zity.Areas.Admin.Controllers
{
    [Area("Admin")]
    public class ModerationController : Controller
    {
        // Esta será la página principal para moderar contenido.
        public IActionResult Index()
        {
            // Necesitará su propia vista en /Areas/Admin/Views/Moderation/Index.cshtml
            return View();
        }
    }
}