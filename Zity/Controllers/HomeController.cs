using Microsoft.AspNetCore.Mvc;
using Zity.Models;
using System.Diagnostics;

namespace Zity.Controllers
{
    public class HomeController : Controller
    {
        // YA NO NECESITAMOS UNA VISTA 'INDEX' AQUÍ
        // La eliminamos para evitar cualquier confusión.

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

       
    }
}