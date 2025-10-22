using Microsoft.AspNetCore.Mvc;

namespace Zity.Areas.Admin.Controllers
{
    [Area("Admin")]
    public class UserManagementController : Controller
    {
        public IActionResult Index()
        {
            // En una app real, aquí cargarías la lista de usuarios desde la BD
            return View();
        }
    }
}