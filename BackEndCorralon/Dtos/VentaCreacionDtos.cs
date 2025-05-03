namespace ApiCorralon.Dtos
{
    public class VentaCreacionDto
    {
        public int UsuarioId { get; set; }
        public int? ClienteId { get; set; }
        public List<DetalleVentaCreacionDto> Detalles { get; set; } = new List<DetalleVentaCreacionDto>();
    }
}