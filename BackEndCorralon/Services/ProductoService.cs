using ApiCorralon.Models;
using ApiCorralon.Dtos;
using Microsoft.EntityFrameworkCore;
using ApiCorralon.Data;

namespace ApiCorralon.Services
{
    public class ProductoService
    {
        private readonly AppDbContext _context;

        public ProductoService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<ProductoRespuestaDto>> ObtenerTodos()
        {
            return await _context.Productos
                .Include(p => p.Categoria)
                .Select(p => new ProductoRespuestaDto
                {
                    Id = p.Id,
                    Nombre = p.Nombre,
                    Precio = p.Precio,
                    Stock = p.Stock,
                    CategoriaId = p.CategoriaId,
                    CategoriaNombre = p.Categoria.Nombre
                })
                .ToListAsync();
        }

        public async Task<ProductoRespuestaDto> ObtenerPorId(int id)
        {
            var producto = await _context.Productos
                .Include(p => p.Categoria)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (producto == null)
            {
                throw new Exception("Producto no encontrado");
            }

            return new ProductoRespuestaDto
            {
                Id = producto.Id,
                Nombre = producto.Nombre,
                Precio = producto.Precio,
                Stock = producto.Stock,
                CategoriaId = producto.CategoriaId,
                CategoriaNombre = producto.Categoria.Nombre
            };
        }

        public async Task<ProductoRespuestaDto> Crear(ProductoCreacionDto productoDto)
        {
            if (string.IsNullOrWhiteSpace(productoDto.Nombre))
            {
                throw new ArgumentException("El nombre del producto es obligatorio.");
            }

            if (productoDto.Precio <= 0)
            {
                throw new ArgumentException("El precio debe ser mayor que cero.");
            }

            if (productoDto.Stock < 0)
            {
                throw new ArgumentException("El stock no puede ser negativo.");
            }

            var categoria = await _context.Categorias.FindAsync(productoDto.CategoriaId);
            if (categoria == null)
            {
                throw new Exception($"Categoría con ID {productoDto.CategoriaId} no encontrada.");
            }

            var producto = new Producto
            {
                Nombre = productoDto.Nombre,
                Precio = productoDto.Precio,
                Stock = productoDto.Stock,
                CategoriaId = productoDto.CategoriaId
            };

            try
            {
                _context.Productos.Add(producto);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                throw new Exception($"Error al guardar el producto: {ex.InnerException?.Message ?? ex.Message}", ex);
            }

            return await ObtenerPorId(producto.Id);
        }

        public async Task<ProductoRespuestaDto> Actualizar(int id, ProductoActualizacionDto productoDto)
        {
            var producto = await _context.Productos.FindAsync(id);
            if (producto == null)
            {
                throw new Exception("Producto no encontrado");
            }

            producto.Nombre = productoDto.Nombre;
            producto.Precio = productoDto.Precio;
            producto.Stock = productoDto.Stock;
            producto.CategoriaId = productoDto.CategoriaId;

            await _context.SaveChangesAsync();

            return await ObtenerPorId(producto.Id);
        }

        public async Task Eliminar(int id)
        {
            var producto = await _context.Productos.FindAsync(id);
            if (producto == null)
            {
                throw new Exception("Producto no encontrado");
            }

            _context.Productos.Remove(producto);
            await _context.SaveChangesAsync();
        }
        public async Task<Producto> ObtenerProductoParaVenta(int productoId)
        {
            var producto = await _context.Productos
                .FirstOrDefaultAsync(p => p.Id == productoId);

            if (producto == null)
            {
                throw new Exception($"Producto con ID {productoId} no encontrado");
            }

            if (producto.Stock <= 0)
            {
                throw new Exception($"No hay stock disponible para el producto: {producto.Nombre}");
            }

            return producto;
        }
    }
}