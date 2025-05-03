using ApiCorralon.Models;
using ApiCorralon.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using BCrypt.Net;
using ApiCorralon.Data;

namespace ApiCorralon.Services
{
    public class AuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<UsuarioRespuestaDto> Registrar(UsuarioRegistroDto registroDto)
        {
            // Validar si el usuario ya existe
            if (await _context.Usuarios.AnyAsync(u => u.NombreUsuario == registroDto.NombreUsuario))
            {
                throw new Exception("El nombre de usuario ya existe");
            }

            // Hash de la contraseña (FORMA CORRECTA)
            string hashedPassword = BCrypt.Net.BCrypt.HashPassword(registroDto.Contraseña);

            var usuario = new Usuario
            {
                NombreUsuario = registroDto.NombreUsuario,
                Contraseña = hashedPassword,
                Rol = registroDto.Rol
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return new UsuarioRespuestaDto
            {
                Id = usuario.Id,
                NombreUsuario = usuario.NombreUsuario,
                Rol = usuario.Rol
            };
        }
        public async Task<LoginRespuestaDto> Login(UsuarioLoginDto loginDto)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.NombreUsuario == loginDto.NombreUsuario);

            if (usuario == null || !BCrypt.Net.BCrypt.Verify(loginDto.Contraseña, usuario.Contraseña))
            {
                throw new Exception("Credenciales incorrectas");
            }

            var token = GenerarToken(usuario);

            return new LoginRespuestaDto
            {
                Token = token,
                Usuario = new UsuarioRespuestaDto
                {
                    Id = usuario.Id,
                    NombreUsuario = usuario.NombreUsuario,
                    Rol = usuario.Rol
                }
            };
        }

        private string GenerarToken(Usuario usuario)
        {
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
        // Usar ClaimTypes en lugar de JwtRegisteredClaimNames para consistencia
        new Claim(ClaimTypes.Name, usuario.NombreUsuario),
        new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
        new Claim(ClaimTypes.Role, usuario.Rol),
        new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
    };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(Convert.ToDouble(_configuration["Jwt:ExpireHours"])),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}