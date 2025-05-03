using Microsoft.AspNetCore.Mvc;
using ApiCorralon.Dtos;
using ApiCorralon.Services;
using Microsoft.AspNetCore.Authorization;

namespace ApiCorralon.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriasController : ControllerBase
    {
        private readonly CategoriaService _categoriaService;

        public CategoriasController(CategoriaService categoriaService)
        {
            _categoriaService = categoriaService;
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerTodas()
        {
            var categorias = await _categoriaService.ObtenerTodas();
            return Ok(categorias);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            try
            {
                var categoria = await _categoriaService.ObtenerPorId(id);
                return Ok(categoria);
            }
            catch (Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] CategoriaCreacionDto categoriaDto)
        {
            try
            {
                var categoria = await _categoriaService.Crear(categoriaDto);
                return CreatedAtAction(nameof(ObtenerPorId), new { id = categoria.Id }, categoria);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Actualizar(int id, [FromBody] CategoriaActualizacionDto categoriaDto)
        {
            if (categoriaDto == null)
            {
                return BadRequest(new { message = "El cuerpo de la solicitud no puede estar vacío." });
            }

            try
            {
                var categoria = await _categoriaService.Actualizar(id, categoriaDto);
                if (categoria == null)
                {
                    return NotFound(new { message = $"Categoría con ID {id} no encontrada." });
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error al actualizar la categoría", error = ex.InnerException?.Message ?? ex.Message });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Eliminar(int id)
        {
            try
            {
                await _categoriaService.Eliminar(id);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}