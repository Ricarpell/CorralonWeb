namespace ApiCorralon.Dtos
{
    public class DetalleVentaRespuestaDto
    {
        public int ProductoId { get; set; } // Nueva propiedad
        public string ProductoNombre { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
        public decimal Subtotal { get; set; }
    }
}