using ApiCorralon.Models;
using ApiCorralon.Dtos;
using Microsoft.EntityFrameworkCore;
using ApiCorralon.Data;

namespace ApiCorralon.Services
{
    public class CategoriaService
    {
        private readonly AppDbContext _context;

        public CategoriaService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<CategoriaRespuestaDto>> ObtenerTodas()
        {
            return await _context.Categorias
                .Select(c => new CategoriaRespuestaDto
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    CantidadProductos = c.Productos.Count
                })
                .ToListAsync();
        }

        public async Task<CategoriaRespuestaDto> ObtenerPorId(int id)
        {
            var categoria = await _context.Categorias
                .Include(c => c.Productos)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (categoria == null)
            {
                throw new Exception("Categoría no encontrada");
            }

            return new CategoriaRespuestaDto
            {
                Id = categoria.Id,
                Nombre = categoria.Nombre,
                CantidadProductos = categoria.Productos.Count
            };
        }

        public async Task<CategoriaRespuestaDto> Crear(CategoriaCreacionDto categoriaDto)
        {
            var categoria = new Categoria
            {
                Nombre = categoriaDto.Nombre
            };

            _context.Categorias.Add(categoria);
            await _context.SaveChangesAsync();

            return await ObtenerPorId(categoria.Id);
        }

        public async Task<CategoriaRespuestaDto> Actualizar(int id, CategoriaActualizacionDto categoriaDto)
        {
            var categoria = await _context.Categorias.FindAsync(id);
            if (categoria == null)
            {
                return null; // Devolvemos null para que el controlador maneje el 404
            }

            try
            {
                categoria.Nombre = categoriaDto.Nombre ?? categoria.Nombre; // Evita null
                await _context.SaveChangesAsync();
                return await ObtenerPorId(id);
            }
            catch (DbUpdateException ex)
            {
                // Log the exception (e.g., using a logging framework)
                throw new Exception($"Error al actualizar la categoría: {ex.InnerException?.Message ?? ex.Message}");
            }
            catch (Exception ex)
            {
                throw new Exception($"Error inesperado: {ex.Message}");
            }
        }

        public async Task Eliminar(int id)
        {
            var categoria = await _context.Categorias.FindAsync(id);
            if (categoria == null)
            {
                throw new Exception("Categoría no encontrada");
            }

            if (await _context.Productos.AnyAsync(p => p.CategoriaId == id))
            {
                throw new Exception("No se puede eliminar una categoría con productos asociados");
            }

            _context.Categorias.Remove(categoria);
            await _context.SaveChangesAsync();
        }
    }
}