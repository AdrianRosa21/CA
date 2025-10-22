namespace Zity.Models // Asegúrate de que el namespace coincida con tu proyecto
{
    public class ErrorViewModel
    {
        // ESTA ES LA PROPIEDAD QUE FALTABA
        public string? RequestId { get; set; }

        public bool ShowRequestId => !string.IsNullOrEmpty(RequestId);
    }
}