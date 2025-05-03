using ApiCorralon.Data;
using ApiCorralon.Dtos;
using ApiCorralon.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ApiCorralon.Services
{
    public class VentaService
    {
        private readonly AppDbContext _context;

        public VentaService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<VentaRespuestaDto>> GetAllAsync()
        {
            var ventas = await _context.Ventas
                .Include(v => v.Usuario)
                .Include(v => v.Cliente)
                .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
                .ToListAsync();

            return ventas.Select(v => new VentaRespuestaDto
            {
                Id = v.Id,
                UsuarioId = v.UsuarioId,
                UsuarioNombre = v.Usuario?.NombreUsuario,
                ClienteId = v.ClienteId,
                NombreCliente = v.Cliente?.Nombre,
                Fecha = v.Fecha,
                Total = v.Total,
                Detalles = v.Detalles.Select(d => new DetalleVentaRespuestaDto
                {
                    ProductoId = d.ProductoId, // Añadido
                    ProductoNombre = d.Producto?.Nombre,
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.PrecioUnitario,
                    Subtotal = d.Cantidad * d.PrecioUnitario
                }).ToList()
            }).ToList();
        }

        public async Task<VentaRespuestaDto> GetByIdAsync(int id)
        {
            var venta = await _context.Ventas
                .Include(v => v.Usuario)
                .Include(v => v.Cliente)
                .Include(v => v.Detalles)
                .ThenInclude(d => d.Producto)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (venta == null)
            {
                return null;
            }

            return new VentaRespuestaDto
            {
                Id = venta.Id,
                UsuarioId = venta.UsuarioId,
                UsuarioNombre = venta.Usuario?.NombreUsuario,
                ClienteId = venta.ClienteId,
                NombreCliente = venta.Cliente?.Nombre,
                Fecha = venta.Fecha,
                Total = venta.Total,
                Detalles = venta.Detalles.Select(d => new DetalleVentaRespuestaDto
                {
                    ProductoId = d.ProductoId, // Añadido
                    ProductoNombre = d.Producto?.Nombre,
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.PrecioUnitario,
                    Subtotal = d.Cantidad * d.PrecioUnitario
                }).ToList()
            };
        }

        public async Task<VentaRespuestaDto> CreateAsync(VentaCreacionDto ventaDto)
        {
            if (ventaDto == null)
            {
                throw new ArgumentException("Los datos de la venta no pueden ser nulos.");
            }

            // Validar UsuarioId
            var usuarioExists = await _context.Usuarios.AnyAsync(u => u.Id == ventaDto.UsuarioId);
            if (!usuarioExists)
            {
                throw new ArgumentException($"El usuario con ID {ventaDto.UsuarioId} no existe.");
            }

            // Validar ClienteId (si se proporciona)
            if (ventaDto.ClienteId.HasValue)
            {
                var clienteExists = await _context.Clientes.AnyAsync(c => c.Id == ventaDto.ClienteId.Value);
                if (!clienteExists)
                {
                    throw new ArgumentException($"El cliente con ID {ventaDto.ClienteId.Value} no existe.");
                }
            }

            // Validar Detalles
            if (ventaDto.Detalles == null || !ventaDto.Detalles.Any())
            {
                throw new ArgumentException("La venta debe incluir al menos un detalle.");
            }

            foreach (var detalle in ventaDto.Detalles)
            {
                if (detalle.ProductoId <= 0)
                {
                    throw new ArgumentException($"El productoId {detalle.ProductoId} no es válido.");
                }
                if (detalle.Cantidad <= 0)
                {
                    throw new ArgumentException($"La cantidad del producto con ID {detalle.ProductoId} debe ser mayor a 0.");
                }
                if (detalle.PrecioUnitario <= 0)
                {
                    throw new ArgumentException($"El precio unitario del producto con ID {detalle.ProductoId} debe ser mayor a 0.");
                }

                var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == detalle.ProductoId);
                if (producto == null)
                {
                    throw new ArgumentException($"El producto con ID {detalle.ProductoId} no existe.");
                }
                if (detalle.Cantidad > producto.Stock)
                {
                    throw new ArgumentException($"No hay suficiente stock para el producto con ID {detalle.ProductoId}. Stock disponible: {producto.Stock}.");
                }
            }

            // Crear la venta
            var venta = new Venta
            {
                UsuarioId = ventaDto.UsuarioId,
                ClienteId = ventaDto.ClienteId,
                Fecha = DateTime.Now,
                Detalles = ventaDto.Detalles.Select(d => new DetalleVenta
                {
                    ProductoId = d.ProductoId,
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.PrecioUnitario
                }).ToList()
            };

            // Calcular el total
            venta.Total = venta.Detalles.Sum(d => d.Cantidad * d.PrecioUnitario);

            // Actualizar stock
            foreach (var detalle in venta.Detalles)
            {
                var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == detalle.ProductoId);
                if (producto != null)
                {
                    producto.Stock -= detalle.Cantidad;
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Ventas.Add(venta);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            // Retornar la respuesta
            return new VentaRespuestaDto
            {
                Id = venta.Id,
                UsuarioId = venta.UsuarioId,
                UsuarioNombre = (await _context.Usuarios.FirstOrDefaultAsync(u => u.Id == venta.UsuarioId))?.NombreUsuario,
                ClienteId = venta.ClienteId,
                NombreCliente = venta.ClienteId.HasValue ? (await _context.Clientes.FirstOrDefaultAsync(c => c.Id == venta.ClienteId.Value))?.Nombre : null,
                Fecha = venta.Fecha,
                Total = venta.Total,
                Detalles = venta.Detalles.Select(d => new DetalleVentaRespuestaDto
                {
                    ProductoId = d.ProductoId, // Añadido
                    ProductoNombre = _context.Productos.FirstOrDefault(p => p.Id == d.ProductoId)?.Nombre,
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.PrecioUnitario,
                    Subtotal = d.Cantidad * d.PrecioUnitario
                }).ToList()
            };
        }

        public async Task<VentaRespuestaDto> UpdateAsync(int id, VentaCreacionDto ventaDto)
        {
            if (ventaDto == null)
            {
                throw new ArgumentException("Los datos de la venta no pueden ser nulos.");
            }

            var existingVenta = await _context.Ventas
                .Include(v => v.Detalles)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (existingVenta == null)
            {
                return null;
            }

            // Validar UsuarioId
            var usuarioExists = await _context.Usuarios.AnyAsync(u => u.Id == ventaDto.UsuarioId);
            if (!usuarioExists)
            {
                throw new ArgumentException($"El usuario con ID {ventaDto.UsuarioId} no existe.");
            }

            // Validar ClienteId (si se proporciona)
            if (ventaDto.ClienteId.HasValue)
            {
                var clienteExists = await _context.Clientes.AnyAsync(c => c.Id == ventaDto.ClienteId.Value);
                if (!clienteExists)
                {
                    throw new ArgumentException($"El cliente con ID {ventaDto.ClienteId.Value} no existe.");
                }
            }

            // Validar Detalles
            if (ventaDto.Detalles == null || !ventaDto.Detalles.Any())
            {
                throw new ArgumentException("La venta debe incluir al menos un detalle.");
            }

            foreach (var detalle in ventaDto.Detalles)
            {
                if (detalle.ProductoId <= 0)
                {
                    throw new ArgumentException($"El productoId {detalle.ProductoId} no es válido.");
                }
                if (detalle.Cantidad <= 0)
                {
                    throw new ArgumentException($"La cantidad del producto con ID {detalle.ProductoId} debe ser mayor a 0.");
                }
                if (detalle.PrecioUnitario <= 0)
                {
                    throw new ArgumentException($"El precio unitario del producto con ID {detalle.ProductoId} debe ser mayor a 0.");
                }

                var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == detalle.ProductoId);
                if (producto == null)
                {
                    throw new ArgumentException($"El producto con ID {detalle.ProductoId} no existe.");
                }
                if (detalle.Cantidad > producto.Stock)
                {
                    throw new ArgumentException($"No hay suficiente stock para el producto con ID {detalle.ProductoId}. Stock disponible: {producto.Stock}.");
                }
            }

            // Restaurar stock de los detalles existentes
            foreach (var detalle in existingVenta.Detalles)
            {
                var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == detalle.ProductoId);
                if (producto != null)
                {
                    producto.Stock += detalle.Cantidad;
                }
            }

            // Actualizar la venta
            existingVenta.UsuarioId = ventaDto.UsuarioId;
            existingVenta.ClienteId = ventaDto.ClienteId;
            // Preservar la fecha original
            // existingVenta.Fecha = DateTime.Now;

            // Actualizar detalles
            _context.DetalleVentas.RemoveRange(existingVenta.Detalles);
            existingVenta.Detalles = ventaDto.Detalles.Select(d => new DetalleVenta
            {
                ProductoId = d.ProductoId,
                Cantidad = d.Cantidad,
                PrecioUnitario = d.PrecioUnitario
            }).ToList();

            // Recalcular el total
            existingVenta.Total = existingVenta.Detalles.Sum(d => d.Cantidad * d.PrecioUnitario);

            // Actualizar stock
            foreach (var detalle in existingVenta.Detalles)
            {
                var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == detalle.ProductoId);
                if (producto != null)
                {
                    producto.Stock -= detalle.Cantidad;
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            // Retornar la respuesta
            return new VentaRespuestaDto
            {
                Id = existingVenta.Id,
                UsuarioId = existingVenta.UsuarioId,
                UsuarioNombre = (await _context.Usuarios.FirstOrDefaultAsync(u => u.Id == existingVenta.UsuarioId))?.NombreUsuario,
                ClienteId = existingVenta.ClienteId,
                NombreCliente = existingVenta.ClienteId.HasValue ? (await _context.Clientes.FirstOrDefaultAsync(c => c.Id == existingVenta.ClienteId.Value))?.Nombre : null,
                Fecha = existingVenta.Fecha,
                Total = existingVenta.Total,
                Detalles = existingVenta.Detalles.Select(d => new DetalleVentaRespuestaDto
                {
                    ProductoId = d.ProductoId, // Añadido
                    ProductoNombre = _context.Productos.FirstOrDefault(p => p.Id == d.ProductoId)?.Nombre,
                    Cantidad = d.Cantidad,
                    PrecioUnitario = d.PrecioUnitario,
                    Subtotal = d.Cantidad * d.PrecioUnitario
                }).ToList()
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var venta = await _context.Ventas
                .Include(v => v.Detalles)
                .FirstOrDefaultAsync(v => v.Id == id);

            if (venta == null)
            {
                return false;
            }

            // Restaurar stock
            foreach (var detalle in venta.Detalles)
            {
                var producto = await _context.Productos.FirstOrDefaultAsync(p => p.Id == detalle.ProductoId);
                if (producto != null)
                {
                    producto.Stock += detalle.Cantidad;
                }
            }

            _context.Ventas.Remove(venta);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}