namespace ApiCorralon.Dtos
{
    public class DetalleVentaReporteDto
    {
        public DateTime Fecha { get; set; }
        public string UsuarioNombre { get; set; }
        public string ProductoNombre { get; set; }
        public string NombreCliente { get; set; } // Nuevo campo
        public int Cantidad { get; set; }
        public decimal Total { get; set; }
    }
}