using Microsoft.AspNetCore.Mvc;
using ApiCorralon.Dtos;
using ApiCorralon.Services;
using Microsoft.AspNetCore.Authorization;

namespace ApiCorralon.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("api/reportes")]
    [ApiController]
    public class ReportesController : ControllerBase
    {
        private readonly ReporteService _reporteService;

        public ReportesController(ReporteService reporteService)
        {
            _reporteService = reporteService;
        }

        [HttpGet("ventas")]
        public async Task<IActionResult> GenerarReporteVentas([FromQuery] ReporteFiltroDto filtro)
        {
            try
            {
                var reporte = await _reporteService.GenerarReporteVentas(filtro);
                return Ok(reporte);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}