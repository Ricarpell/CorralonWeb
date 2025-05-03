namespace ApiCorralon.Dtos
{
    public class VentaRespuestaDto
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public string UsuarioNombre { get; set; }
        public int? ClienteId { get; set; } // Añadido
        public string NombreCliente { get; set; } // Añadido
        public DateTime Fecha { get; set; }
        public decimal Total { get; set; }
        public List<DetalleVentaRespuestaDto> Detalles { get; set; }
    }
}