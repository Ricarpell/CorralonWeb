using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ApiCorralon.Data;
using Microsoft.AspNetCore.Authorization;
using ApiCorralon.Dtos;
using BCrypt.Net;

namespace ApiCorralon.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsuariosController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsuarios()
        {
            try
            {
                var usuarios = await _context.Usuarios
                    .Select(u => new
                    {
                        id = u.Id,
                        nombre = u.NombreUsuario,
                        rol = u.Rol // Asegura que 'rol' coincide con el frontend
                    })
                    .ToListAsync();
                return Ok(usuarios);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUsuario(int id, [FromBody] UsuarioUpdateDto updateDto)
        {
            try
            {
                var usuario = await _context.Usuarios.FindAsync(id);
                if (usuario == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                if (!string.IsNullOrEmpty(updateDto.Contraseña))
                {
                    usuario.Contraseña = BCrypt.Net.BCrypt.HashPassword(updateDto.Contraseña);
                }
                usuario.Rol = updateDto.Rol;

                _context.Usuarios.Update(usuario);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Usuario actualizado exitosamente" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}