namespace ApiCorralon.Dtos
{
    public class ReporteFiltroDto
    {
        public DateTime? FechaDesde { get; set; }
        public DateTime? FechaHasta { get; set; }
        public int? UsuarioId { get; set; }
        public int? ProductoId { get; set; }
        public int? ClienteId { get; set; } // Nuevo campo
    }
}