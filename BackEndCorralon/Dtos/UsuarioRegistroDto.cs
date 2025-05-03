    namespace ApiCorralon.Dtos
    {
        public class UsuarioRegistroDto
        {
            public string NombreUsuario { get; set; }
            public string Contraseña { get; set; }
            public string Rol { get; set; } // "Admin" o "User"
        }
    }
