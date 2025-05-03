// LoginRespuestaDto.cs
namespace ApiCorralon.Dtos
{
    public class LoginRespuestaDto
    {
        public string Token { get; set; }
        public UsuarioRespuestaDto Usuario { get; set; }
    }
}