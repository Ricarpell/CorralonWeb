    namespace ApiCorralon.Dtos
    {
        public class UsuarioRespuestaDto
        {
            public int Id { get; set; }
            public string NombreUsuario { get; set; }
            public string Rol { get; set; }
            // No incluir la contraseña por seguridad
        }
    }
