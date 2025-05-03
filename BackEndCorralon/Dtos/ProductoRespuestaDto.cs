    namespace ApiCorralon.Dtos
    {
        public class ProductoRespuestaDto
        {
            public int Id { get; set; }
            public string Nombre { get; set; }
            public decimal Precio { get; set; }
            public int Stock { get; set; }
            public int CategoriaId { get; set; }
            public string CategoriaNombre { get; set; } // Para mostrar el nombre en lugar del ID
        }
    }
