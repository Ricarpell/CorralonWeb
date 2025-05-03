using ApiCorralon.Models;
using ApiCorralon.Dtos;
using Microsoft.EntityFrameworkCore;
using ApiCorralon.Data;

namespace ApiCorralon.Services
{
    public class ReporteService
    {
        private readonly AppDbContext _context;

        public ReporteService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ReporteVentasDto> GenerarReporteVentas(ReporteFiltroDto filtro)
        {
            var query = _context.Ventas
                .Include(v => v.Usuario)
                .Include(v => v.Cliente)
                .Include(v => v.Detalles)
                    .ThenInclude(d => d.Producto)
                .AsQueryable();

            // Aplicar filtros
            if (filtro.FechaDesde.HasValue)
            {
                query = query.Where(v => v.Fecha >= filtro.FechaDesde.Value);
            }

            if (filtro.FechaHasta.HasValue)
            {
                query = query.Where(v => v.Fecha <= filtro.FechaHasta.Value);
            }

            if (filtro.UsuarioId.HasValue)
            {
                query = query.Where(v => v.UsuarioId == filtro.UsuarioId.Value);
            }

            if (filtro.ProductoId.HasValue)
            {
                query = query.Where(v => v.Detalles.Any(d => d.ProductoId == filtro.ProductoId.Value));
            }

            if (filtro.ClienteId.HasValue)
            {
                query = query.Where(v => v.ClienteId == filtro.ClienteId.Value);
            }

            var ventas = await query.ToListAsync();

            if (!ventas.Any())
            {
                return new ReporteVentasDto();
            }

            // Filtrar detalles por producto si se especificó un ProductoId
            var detalleVentas = ventas
                .SelectMany(v => v.Detalles
                    .Where(d => !filtro.ProductoId.HasValue || d.ProductoId == filtro.ProductoId.Value)
                    .Select(d => new DetalleVentaReporteDto
                    {
                        Fecha = v.Fecha,
                        UsuarioNombre = v.Usuario.NombreUsuario,
                        ProductoNombre = d.Producto.Nombre,
                        NombreCliente = v.Cliente?.Nombre ?? "Sin cliente",
                        Cantidad = d.Cantidad,
                        Total = d.Cantidad * d.PrecioUnitario
                    }))
                .ToList();

            // Producto más vendido (basado en monto monetario)
            var productoMasVendido = detalleVentas
                .GroupBy(d => d.ProductoNombre)
                .Select(g => new
                {
                    ProductoNombre = g.Key,
                    MontoTotal = g.Sum(d => d.Total)
                })
                .OrderByDescending(x => x.MontoTotal)
                .FirstOrDefault();

            // Vendedor con más ventas (basado en monto monetario)
            var vendedorTop = detalleVentas
                .GroupBy(v => v.UsuarioNombre)
                .Select(g => new
                {
                    UsuarioNombre = g.Key,
                    MontoTotal = g.Sum(v => v.Total)
                })
                .OrderByDescending(x => x.MontoTotal)
                .FirstOrDefault();

            // Cliente con más ventas (basado en monto monetario)
            var clienteTop = detalleVentas
                .GroupBy(v => v.NombreCliente)
                .Select(g => new
                {
                    NombreCliente = g.Key,
                    MontoTotal = g.Sum(v => v.Total)
                })
                .OrderByDescending(x => x.MontoTotal)
                .FirstOrDefault();

            return new ReporteVentasDto
            {
                TotalVentas = detalleVentas.Count,
                MontoTotal = detalleVentas.Sum(v => v.Total),
                ProductoMasVendido = productoMasVendido?.ProductoNombre ?? "N/A",
                CantidadProductoMasVendido = detalleVentas
                    .Where(d => d.ProductoNombre == productoMasVendido?.ProductoNombre)
                    .Sum(d => d.Cantidad),
                VendedorTop = vendedorTop?.UsuarioNombre ?? "N/A",
                VentasVendedorTop = detalleVentas
                    .Count(v => v.UsuarioNombre == vendedorTop?.UsuarioNombre),
                ClienteTop = clienteTop?.NombreCliente ?? "N/A", // Nuevo campo
                VentasClienteTop = detalleVentas
                    .Count(v => v.NombreCliente == clienteTop?.NombreCliente),
                VentasPorFecha = detalleVentas
                    .GroupBy(v => v.Fecha.Date)
                    .Select(g => new VentasPorFechaDto
                    {
                        Fecha = g.Key,
                        CantidadVentas = g.Count(),
                        MontoTotal = g.Sum(v => v.Total)
                    })
                    .OrderBy(x => x.Fecha)
                    .ToList(),
                Ventas = detalleVentas
            };
        }
    }
}