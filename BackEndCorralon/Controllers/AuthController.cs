using Microsoft.AspNetCore.Mvc;
using ApiCorralon.Dtos;
using ApiCorralon.Services;
using Microsoft.AspNetCore.Authorization;

namespace ApiCorralon.Controllers
{
    //[Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("registrar")]
        public async Task<IActionResult> Registrar([FromBody] UsuarioRegistroDto registroDto)
        {
            try
            {
                var usuario = await _authService.Registrar(registroDto);
                return Ok(usuario);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UsuarioLoginDto loginDto)
        {
            try
            {
                var respuesta = await _authService.Login(loginDto);
                return Ok(respuesta);
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }
    }
}