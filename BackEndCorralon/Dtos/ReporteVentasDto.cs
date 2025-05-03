namespace ApiCorralon.Dtos
{
    public class ReporteVentasDto
    {
        public int TotalVentas { get; set; }
        public decimal MontoTotal { get; set; }
        public string ProductoMasVendido { get; set; }
        public int CantidadProductoMasVendido { get; set; }
        public string VendedorTop { get; set; }
        public int VentasVendedorTop { get; set; }
        public string ClienteTop { get; set; } // Nuevo campo
        public int VentasClienteTop { get; set; } // Nuevo campo
        public List<VentasPorFechaDto> VentasPorFecha { get; set; } = new List<VentasPorFechaDto>();
        public List<DetalleVentaReporteDto> Ventas { get; set; } = new List<DetalleVentaReporteDto>();
    }
}