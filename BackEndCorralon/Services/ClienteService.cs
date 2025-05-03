using ApiCorralon.Data;
using ApiCorralon.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ApiCorralon.Services
{
    public class ClienteService
    {
        private readonly AppDbContext _context;

        public ClienteService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Cliente>> GetAllAsync()
        {
            return await _context.Clientes.ToListAsync();
        }

        public async Task<Cliente> GetByIdAsync(int id)
        {
            return await _context.Clientes.FindAsync(id);
        }

        public async Task<Cliente> CreateAsync(Cliente cliente)
        {
            _context.Clientes.Add(cliente);
            await _context.SaveChangesAsync();
            return cliente;
        }

        public async Task<Cliente> UpdateAsync(int id, Cliente cliente)
        {
            var existingCliente = await _context.Clientes.FindAsync(id);
            if (existingCliente == null)
            {
                return null;
            }

            try
            {
                existingCliente.Nombre = cliente.Nombre ?? existingCliente.Nombre;
                existingCliente.Email = cliente.Email ?? existingCliente.Email;
                existingCliente.Telefono = cliente.Telefono ?? existingCliente.Telefono;
                existingCliente.Direccion = cliente.Direccion ?? existingCliente.Direccion;

                await _context.SaveChangesAsync();
                return existingCliente;
            }
            catch (DbUpdateException ex)
            {
                // Log the exception (e.g., using a logging framework)
                throw new Exception($"Error al actualizar el cliente: {ex.InnerException?.Message ?? ex.Message}");
            }
            catch (Exception ex)
            {
                throw new Exception($"Error inesperado: {ex.Message}");
            }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return false;
            }

            try
            {
                _context.Clientes.Remove(cliente);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error al eliminar el cliente: {ex.Message}");
            }
        }
    }
}