using ApiCorralon.Dtos;
using ApiCorralon.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ApiCorralon.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Produces("application/json")]
    public class VentasController : ControllerBase
    {
        private readonly VentaService _ventaService;

        public VentasController(VentaService ventaService)
        {
            _ventaService = ventaService;
        }

        [HttpGet]
        [ProducesResponseType(200)]
        public async Task<ActionResult<IEnumerable<VentaRespuestaDto>>> GetVentas()
        {
            var ventas = await _ventaService.GetAllAsync();
            return Ok(ventas);
        }

        [HttpGet("{id}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(404)]
        public async Task<ActionResult<VentaRespuestaDto>> GetVenta(int id)
        {
            var venta = await _ventaService.GetByIdAsync(id);
            if (venta == null)
            {
                return NotFound(new { Message = "Venta no encontrada." });
            }
            return Ok(venta);
        }

        [HttpPost]
        [Consumes("application/json")]
        [ProducesResponseType(201)]
        [ProducesResponseType(400)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<VentaRespuestaDto>> CreateVenta([FromBody] VentaCreacionDto ventaDto)
        {
            try
            {
                var createdVenta = await _ventaService.CreateAsync(ventaDto);
                return CreatedAtAction(nameof(GetVenta), new { id = createdVenta.Id }, createdVenta);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error interno del servidor: " + ex.Message });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        [Consumes("application/json")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<ActionResult<VentaRespuestaDto>> UpdateVenta(int id, [FromBody] VentaCreacionDto ventaDto)
        {
            try
            {
                var updatedVenta = await _ventaService.UpdateAsync(id, ventaDto);
                if (updatedVenta == null)
                {
                    return NotFound(new { Message = "Venta no encontrada." });
                }
                return Ok(updatedVenta);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error interno del servidor: " + ex.Message });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        [ProducesResponseType(204)]
        [ProducesResponseType(404)]
        [ProducesResponseType(500)]
        public async Task<IActionResult> DeleteVenta(int id)
        {
            try
            {
                var deleted = await _ventaService.DeleteAsync(id);
                if (!deleted)
                {
                    return NotFound(new { Message = "Venta no encontrada." });
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = "Error interno del servidor: " + ex.Message });
            }
        }
    }
}