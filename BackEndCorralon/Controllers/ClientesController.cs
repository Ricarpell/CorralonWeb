using ApiCorralon.Dtos;
using ApiCorralon.DTOs;
using ApiCorralon.Models;
using ApiCorralon.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ApiCorralon.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClientesController : ControllerBase
    {
        private readonly ClienteService _clienteService;

        public ClientesController(ClienteService clienteService)
        {
            _clienteService = clienteService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ClienteResponseDTO>>> GetClientes()
        {
            var clientes = await _clienteService.GetAllAsync();
            var clienteDtos = clientes.Select(c => new ClienteResponseDTO
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Email = c.Email,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                FechaRegistro = c.FechaRegistro
            }).ToList();
            return Ok(clienteDtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ClienteResponseDTO>> GetCliente(int id)
        {
            var cliente = await _clienteService.GetByIdAsync(id);
            if (cliente == null)
            {
                return NotFound();
            }

            var clienteDto = new ClienteResponseDTO
            {
                Id = cliente.Id,
                Nombre = cliente.Nombre,
                Email = cliente.Email,
                Telefono = cliente.Telefono,
                Direccion = cliente.Direccion,
                FechaRegistro = cliente.FechaRegistro
            };
            return Ok(clienteDto);
        }

        [HttpPost]
        public async Task<ActionResult<ClienteResponseDTO>> CreateCliente([FromBody] ClienteCreateDTO clienteDto)
        {
            if (clienteDto == null)
            {
                return BadRequest(new { message = "El cuerpo de la solicitud no puede estar vacío." });
            }

            var cliente = new Cliente
            {
                Nombre = clienteDto.Nombre,
                Email = clienteDto.Email,
                Telefono = clienteDto.Telefono,
                Direccion = clienteDto.Direccion
            };

            try
            {
                var createdCliente = await _clienteService.CreateAsync(cliente);
                var responseDto = new ClienteResponseDTO
                {
                    Id = createdCliente.Id,
                    Nombre = createdCliente.Nombre,
                    Email = createdCliente.Email,
                    Telefono = createdCliente.Telefono,
                    Direccion = createdCliente.Direccion,
                    FechaRegistro = createdCliente.FechaRegistro
                };
                return CreatedAtAction(nameof(GetCliente), new { id = createdCliente.Id }, responseDto);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error al crear el cliente", error = ex.InnerException?.Message ?? ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCliente(int id, [FromBody] ClienteCreateDTO clienteDto)
        {
            if (clienteDto == null)
            {
                return BadRequest(new { message = "El cuerpo de la solicitud no puede estar vacío." });
            }

            var cliente = new Cliente
            {
                Id = id,
                Nombre = clienteDto.Nombre,
                Email = clienteDto.Email,
                Telefono = clienteDto.Telefono,
                Direccion = clienteDto.Direccion
            };

            try
            {
                var updatedCliente = await _clienteService.UpdateAsync(id, cliente);
                if (updatedCliente == null)
                {
                    return NotFound(new { message = $"Cliente con ID {id} no encontrado." });
                }
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                return BadRequest(new { message = "Error al actualizar el cliente", error = ex.InnerException?.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error inesperado", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCliente(int id)
        {
            try
            {
                var deleted = await _clienteService.DeleteAsync(id);
                if (!deleted)
                {
                    return NotFound(new { message = $"Cliente con ID {id} no encontrado." });
                }
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error al eliminar el cliente", error = ex.Message });
            }
        }
    }
}