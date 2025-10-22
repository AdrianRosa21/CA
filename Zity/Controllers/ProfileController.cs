using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Zity.Controllers
{
    public class ProfileController : Controller
    {
        // YA NO NECESITA LÓGICA DE TEMA. ES MÁS LIMPIO.
        public IActionResult Index()
        {
            ViewData["ActivePage"] = "Profile";
            return View();
        }
        public IActionResult Preferencias()
        {
            ViewData["ActivePage"] = "Preferencias";
            return View();
        }
        public IActionResult HistorialReportes()
        {
            ViewData["ActivePage"] = "HistorialReportes";
            return View();
        }
        public IActionResult ParticipacionesForo()
        {
            ViewData["ActivePage"] = "ParticipacionesForo";
            return View();
        }
        public IActionResult EventosCreados()
        {
            ViewData["ActivePage"] = "EventosCreados";
            return View();
        }

        [HttpPost]
        public IActionResult HabilitarNotificaciones()
        {
            // Lógica futura para guardar en la BD...
            TempData["SuccessMessage"] = "Las notificaciones han sido habilitadas.";
            return RedirectToAction("Preferencias");
        }

        [HttpPost]
        public IActionResult DeshabilitarNotificaciones()
        {
            TempData["SuccessMessage"] = "Las notificaciones han sido deshabilitadas.";
            return RedirectToAction("Preferencias");
        }

        [HttpPost]
        public IActionResult HabilitarAnonimo()
        {
            TempData["SuccessMessage"] = "El modo anónimo ha sido habilitado.";
            return RedirectToAction("Preferencias");
        }

        [HttpPost]
        public IActionResult DeshabilitarAnonimo()
        {
            TempData["SuccessMessage"] = "El modo anónimo ha sido deshabilitado.";
            return RedirectToAction("Preferencias");
        }
        // ... Y así para las demás acciones ...

        // Esta acción se mantiene igual, ¡está perfecta!
        [HttpPost]
        public IActionResult ToggleTheme()
        {
            Request.Cookies.TryGetValue("Theme", out var currentTheme);
            bool isNowDark = currentTheme != "dark";

            var cookieOptions = new CookieOptions
            {
                Expires = System.DateTimeOffset.Now.AddYears(1),
                HttpOnly = true,
                IsEssential = true,
                Path = "/"
            };

            if (isNowDark)
            {
                Response.Cookies.Append("Theme", "dark", cookieOptions);
            }
            else
            {
                Response.Cookies.Delete("Theme");
            }

            return Ok();
        }

    }
}