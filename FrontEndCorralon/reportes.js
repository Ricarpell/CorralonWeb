/* Variables globales */
let ventasChart;
let productosLista = [];
let clientesLista = [];
let ultimoReporte = null;
let printVentasChart = null; // Variable para el gráfico imprimible
const API_URL = 'https://corralon-backend.onrender.com';

/* Función principal de inicialización */
function initReportes() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Asignar eventos a los botones
    const generarReporteBtn = document.getElementById("generarReporte");
    const imprimirReporteBtn = document.getElementById("imprimirReporte");
    const exportarPDFBtn = document.getElementById("exportarPDF");
    const exportarExcelBtn = document.getElementById("exportarExcel");
    const volverDashboardBtn = document.getElementById("volverDashboard");
    const cerrarSesionBtn = document.getElementById("cerrarSesion");

    if (generarReporteBtn) {
        generarReporteBtn.addEventListener("click", () => generarReporte(token));
    } else {
        console.error("Botón 'generarReporte' no encontrado");
    }

    if (imprimirReporteBtn) {
        imprimirReporteBtn.addEventListener("click", imprimirReporte);
    } else {
        console.error("Botón 'imprimirReporte' no encontrado");
    }

    if (exportarPDFBtn) {
        exportarPDFBtn.addEventListener("click", exportarPDF);
    } else {
        console.error("Botón 'exportarPDF' no encontrado");
    }

    if (exportarExcelBtn) {
        exportarExcelBtn.addEventListener("click", exportarExcel);
    } else {
        console.error("Botón 'exportarExcel' no encontrado");
    }

    if (volverDashboardBtn) {
        volverDashboardBtn.addEventListener("click", () => {
            window.location.href = "dashboard.html";
        });
    } else {
        console.error("Botón 'volverDashboard' no encontrado");
    }

    if (cerrarSesionBtn) {
        cerrarSesionBtn.addEventListener("click", () => {
            localStorage.removeItem("token");
            window.location.href = "index.html";
        });
    } else {
        console.error("Botón 'cerrarSesion' no encontrado");
    }

    // Cargar filtros
    cargarFiltros(token).catch(error => {
        console.error("Error al cargar filtros:", error);
        mostrarNotificacion("Error al cargar filtros: " + error.message, "error");
    });
}

/* Cargar lista de productos, vendedores y clientes */
async function cargarFiltros(token) {
    try {
        // Cargar productos
        const productoSelect = document.getElementById("productoId");
        if (productoSelect) {
            const productosResponse = await fetch(`${API_URL}/api/Productos`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!productosResponse.ok) throw new Error("Error al cargar productos: " + productosResponse.statusText);
            productosLista = await productosResponse.json();
            productoSelect.innerHTML = '<option value="">Todos los productos</option>';
            productosLista.forEach(producto => {
                const option = document.createElement("option");
                option.value = producto.id;
                option.textContent = producto.nombre;
                productoSelect.appendChild(option);
            });
        }

        // Cargar vendedores
        const usuarioSelect = document.getElementById("usuarioId");
        if (usuarioSelect) {
            const usuariosResponse = await fetch(`${API_URL}/api/Usuarios`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!usuariosResponse.ok) throw new Error("Error al cargar vendedores: " + usuariosResponse.statusText);
            const vendedores = await usuariosResponse.json();
            usuarioSelect.innerHTML = '<option value="">Todos los vendedores</option>';
            vendedores.forEach(vendedor => {
                const option = document.createElement("option");
                option.value = vendedor.id;
                option.textContent = vendedor.nombre;
                usuarioSelect.appendChild(option);
            });
        }

        // Cargar clientes
        const clienteSelect = document.getElementById("clienteId");
        if (clienteSelect) {
            const clientesResponse = await fetch(`${API_URL}/api/Clientes`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!clientesResponse.ok) throw new Error("Error al cargar clientes: " + clientesResponse.statusText);
            clientesLista = await clientesResponse.json();
            clienteSelect.innerHTML = '<option value="">Todos los clientes</option>';
            clientesLista.forEach(cliente => {
                const option = document.createElement("option");
                option.value = cliente.id;
                option.textContent = cliente.nombre;
                clienteSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error al cargar filtros:", error);
        throw error;
    }
}

/* Obtener valores de los filtros */
function obtenerValoresFiltros() {
    return {
        fechaDesde: document.getElementById("fechaDesde")?.value,
        fechaHasta: document.getElementById("fechaHasta")?.value,
        productoId: document.getElementById("productoId")?.value,
        usuarioId: document.getElementById("usuarioId")?.value,
        clienteId: document.getElementById("clienteId")?.value,
        incluirGrafico: document.getElementById("incluirGrafico")?.checked
    };
}

/* Obtener datos del reporte desde la API */
async function obtenerDatosReporte(token, fechaDesde, fechaHasta, productoId, usuarioId, clienteId) {
    const params = new URLSearchParams();
    if (fechaDesde) params.append("fechaDesde", fechaDesde);
    if (fechaHasta) params.append("fechaHasta", fechaHasta);
    if (productoId) params.append("productoId", productoId);
    if (usuarioId) params.append("usuarioId", usuarioId);
    if (clienteId) params.append("clienteId", clienteId);

    const url = `${API_URL}/api/Ventas?${params.toString()}`;
    const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
    });

    if (!response.ok) {
        const responseData = await response.json().catch(() => null);
        throw new Error(responseData?.message || `Error ${response.status}: ${response.statusText}`);
    }

    return transformarDatosReporte(await response.json());
}

/* Transformar datos de la API */
function transformarDatosReporte(apiData) {
    const reporte = {
        ventas: [],
        totalVentas: 0,
        totalProductosVendidos: 0,
        vendedorDestacado: "N/A",
        clienteDestacado: "N/A",
        productoMasVendido: "N/A"
    };

    if (apiData.ventas) {
        reporte.ventas = apiData.ventas.map(item => ({
            fecha: item.fecha,
            usuarioNombre: item.usuarioNombre,
            clienteNombre: item.nombreCliente || "Sin cliente",
            productoNombre: item.productoNombre,
            cantidad: Number(item.cantidad),
            total: Number(item.total)
        }));
    }

    // Calcular totales
    reporte.totalVentas = apiData.montoTotal || 0;
    reporte.totalProductosVendidos = apiData.ventas?.reduce((sum, venta) => sum + (venta.cantidad || 0), 0) || 0;
    reporte.vendedorDestacado = apiData.vendedorTop || "N/A";
    reporte.clienteDestacado = apiData.clienteTop || "N/A";
    reporte.productoMasVendido = apiData.productoMasVendido || "N/A";

    return reporte;
}

/* Formatear moneda */
function formatearMoneda(valor) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(valor).replace('CLP', '$');
}

/* Mostrar resultados */
function mostrarResultados(reporte) {
    ultimoReporte = reporte;
    console.log("Mostrando resultados:", reporte); // Depuración

    document.getElementById("totalVentas").textContent = formatearMoneda(reporte.totalVentas);
    document.getElementById("totalProductos").textContent = reporte.totalProductosVendidos.toLocaleString();
    document.getElementById("vendedorDestacado").textContent = reporte.vendedorDestacado;
    document.getElementById("clienteDestacado").textContent = reporte.clienteDestacado;
    document.getElementById("productoDestacado").textContent = reporte.productoMasVendido;

    const tbody = document.getElementById("detalleVentas").querySelector("tbody");
    if (!tbody) console.error("Tabla #detalleVentas no encontrada"); // Depuración
    tbody.innerHTML = reporte.ventas.map(venta => `
        <tr>
            <td>${venta.fecha ? new Date(venta.fecha).toLocaleDateString('es-CL') : 'N/A'}</td>
            <td>${venta.usuarioNombre}</td>
            <td>${venta.clienteNombre}</td>
            <td>${venta.productoNombre}</td>
            <td>${venta.cantidad.toLocaleString()}</td>
            <td>${formatearMoneda(venta.total)}</td>
        </tr>
    `).join('');

    configurarGrafico(reporte);

    // Habilitar botones de exportación
    const imprimirBtn = document.getElementById("imprimirReporte");
    const pdfBtn = document.getElementById("exportarPDF");
    const excelBtn = document.getElementById("exportarExcel");
    if (imprimirBtn) imprimirBtn.disabled = false;
    if (pdfBtn) pdfBtn.disabled = false;
    if (excelBtn) excelBtn.disabled = false;

    // Actualizar sección imprimible
    actualizarSeccionImprimible();
}

/* Configurar gráfico */
function configurarGrafico(reporte, isPrintable = false, canvasId = "ventasChart") {
    const ctx = document.getElementById(canvasId)?.getContext("2d");
    if (!ctx) {
        console.error(`Canvas '${canvasId}' no encontrado`);
        return null;
    }

    // Destruir gráfico existente si aplica
    if (isPrintable && printVentasChart && typeof printVentasChart.destroy === 'function') {
        printVentasChart.destroy();
        printVentasChart = null;
    } else if (!isPrintable && ventasChart && typeof ventasChart.destroy === 'function') {
        ventasChart.destroy();
        ventasChart = null;
    }

    // Preparar datos para el gráfico
    const fechas = [...new Set(reporte.ventas.map(v => new Date(v.fecha).toLocaleDateString('es-CL')))];
    const vendedores = [...new Set(reporte.ventas.map(v => v.usuarioNombre))];
    const colores = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8'];

    // Total de ventas por fecha
    const datosTotales = fechas.map(fecha => {
        return reporte.ventas
            .filter(v => new Date(v.fecha).toLocaleDateString('es-CL') === fecha)
            .reduce((sum, v) => sum + v.total, 0);
    });

    // Ventas por vendedor por fecha
    const datasetsVendedores = vendedores.map((vendedor, index) => ({
        label: `Ventas ${vendedor} ($)`,
        data: fechas.map(fecha => {
            return reporte.ventas
                .filter(v => new Date(v.fecha).toLocaleDateString('es-CL') === fecha && v.usuarioNombre === vendedor)
                .reduce((sum, v) => sum + v.total, 0);
        }),
        borderColor: colores[index % colores.length],
        backgroundColor: colores[index % colores.length] + '33',
        fill: false
    }));

    // Combinar datasets
    const datasets = [
        {
            label: 'Total Ventas ($)',
            data: datosTotales,
            borderColor: '#343a40',
            backgroundColor: 'rgba(52, 58, 64, 0.1)',
            fill: true
        },
        ...datasetsVendedores
    ];

    const chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fechas,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => `$${value.toLocaleString('es-CL')}`
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });

    if (isPrintable) {
        printVentasChart = chartInstance;
    } else {
        ventasChart = chartInstance;
    }

    return chartInstance;
}

/* Actualizar sección imprimible */
function actualizarSeccionImprimible() {
    if (!ultimoReporte) return;

    const filtros = obtenerValoresFiltros();
    document.getElementById("printPeriodo").textContent = 
        (filtros.fechaDesde && filtros.fechaHasta) 
            ? `${new Date(filtros.fechaDesde).toLocaleDateString('es-CL')} - ${new Date(filtros.fechaHasta).toLocaleDateString('es-CL')}` 
            : "Todos los periodos";
    document.getElementById("printVendedor").textContent = 
        filtros.usuarioId ? document.querySelector(`#usuarioId option[value="${filtros.usuarioId}"]`)?.textContent || "Todos" : "Todos";
    document.getElementById("printProducto").textContent = 
        filtros.productoId ? document.querySelector(`#productoId option[value="${filtros.productoId}"]`)?.textContent || "Todos" : "Todos";
    document.getElementById("printCliente").textContent = 
        filtros.clienteId ? document.querySelector(`#clienteId option[value="${filtros.clienteId}"]`)?.textContent || "Todos" : "Todos";
    document.getElementById("printTotalVentas").textContent = formatearMoneda(ultimoReporte.totalVentas);
    document.getElementById("printTotalProductos").textContent = ultimoReporte.totalProductosVendidos.toLocaleString();

    const printTbody = document.getElementById("printDetalleVentas");
    printTbody.innerHTML = ultimoReporte.ventas.map(venta => `
        <tr>
            <td>${venta.fecha ? new Date(venta.fecha).toLocaleDateString('es-CL') : 'N/A'}</td>
            <td>${venta.usuarioNombre}</td>
            <td>${venta.clienteNombre}</td>
            <td>${venta.productoNombre}</td>
            <td>${venta.cantidad.toLocaleString()}</td>
            <td>${formatearMoneda(venta.total)}</td>
        </tr>
    `).join('');

    // Mostrar u ocultar el gráfico según la selección
    const incluirGrafico = filtros.incluirGrafico;
    document.getElementById("graficoTitulo").style.display = incluirGrafico ? 'block' : 'none';
    document.getElementById("printVentasChart").style.display = incluirGrafico ? 'block' : 'none';

    if (incluirGrafico) {
        configurarGrafico(ultimoReporte, true, "printVentasChart");
    }
}

/* Imprimir reporte */
function imprimirReporte() {
    if (!ultimoReporte) {
        mostrarNotificacion("No hay reporte para imprimir", "error");
        return;
    }

    const printContent = document.getElementById("printableReport");
    if (!printContent) {
        console.error("Elemento 'printableReport' no encontrado");
        mostrarNotificacion("Error al preparar la impresión", "error");
        return;
    }

    // Crear un iframe temporal para la impresión
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
        <html>
            <head>
                <link rel="stylesheet" href="styles.css">
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    body { font-family: 'Poppins', sans-serif; }
                    .printable-report { display: block; }
                    .admin-table { width: 100%; border-collapse: collapse; }
                    .admin-table th, .admin-table td { border: 1px solid #000; padding: 8px; text-align: left; }
                    .admin-table tbody tr:last-child td { border-bottom: 1px solid #000; }
                    .resumen-columnas { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    .resumen-columnas .columna { width: 45%; }
                    #printVentasChart { max-width: 100%; height: auto; margin: 20px 0; }
                </style>
            </head>
            <body>
                ${printContent.outerHTML}
                <script>
                    // Reconfigurar el gráfico después de cargar el iframe
                    ${obtenerValoresFiltros().incluirGrafico ? `
                    const reporte = ${JSON.stringify(ultimoReporte)};
                    const ctx = document.getElementById("printVentasChart").getContext("2d");
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: ${JSON.stringify([...new Set(ultimoReporte.ventas.map(v => new Date(v.fecha).toLocaleDateString('es-CL')))])},
                            datasets: [
                                {
                                    label: 'Total Ventas ($)',
                                    data: ${JSON.stringify([...new Set(ultimoReporte.ventas.map(v => new Date(v.fecha).toLocaleDateString('es-CL')))].map(fecha => {
                                        return ultimoReporte.ventas
                                            .filter(v => new Date(v.fecha).toLocaleDateString('es-CL') === fecha)
                                            .reduce((sum, v) => sum + v.total, 0);
                                    }))},
                                    borderColor: '#343a40',
                                    backgroundColor: 'rgba(52, 58, 64, 0.1)',
                                    fill: true
                                },
                                ${[...new Set(ultimoReporte.ventas.map(v => v.usuarioNombre))].map((vendedor, index) => `
                                {
                                    label: 'Ventas ${vendedor} ($)',
                                    data: ${JSON.stringify([...new Set(ultimoReporte.ventas.map(v => new Date(v.fecha).toLocaleDateString('es-CL')))].map(fecha => {
                                        return ultimoReporte.ventas
                                            .filter(v => new Date(v.fecha).toLocaleDateString('es-CL') === fecha && v.usuarioNombre === vendedor)
                                            .reduce((sum, v) => sum + v.total, 0);
                                    }))},
                                    borderColor: '${['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8'][index % 5]}',
                                    backgroundColor: '${['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8'][index % 5] + '33'}',
                                    fill: false
                                }
                                `).join(',')}
                            ]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: value => '$' + value.toLocaleString('es-CL')
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top'
                                }
                            }
                        }
                    });
                    // Notificar cuando el gráfico esté listo
                    window.chartReady = true;
                    ` : ''}
                </script>
            </body>
        </html>
    `);
    iframeDoc.close();

    // Esperar a que el gráfico esté listo antes de imprimir
    const waitForChart = (callback) => {
        if (!obtenerValoresFiltros().incluirGrafico || iframe.contentWindow.chartReady) {
            callback();
        } else {
            setTimeout(() => waitForChart(callback), 100);
        }
    };

    iframe.contentWindow.focus();
    waitForChart(() => {
        iframe.contentWindow.print();
        document.body.removeChild(iframe);
    });
}

/* Exportar a PDF */
function exportarPDF() {
    if (!ultimoReporte) {
        mostrarNotificacion("No hay reporte para exportar", "error");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF no está cargado");
        mostrarNotificacion("Error: jsPDF no disponible", "error");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Informe de Ventas", 10, 10);

    doc.setFontSize(12);
    // Columna izquierda
    doc.text(`Periodo: ${document.getElementById("printPeriodo").textContent}`, 10, 20);
    doc.text(`Vendedor: ${document.getElementById("printVendedor").textContent}`, 10, 30);
    doc.text(`Cliente: ${document.getElementById("printCliente").textContent}`, 10, 40);
    // Columna derecha
    doc.text(`Producto: ${document.getElementById("printProducto").textContent}`, 105, 20);
    doc.text(`Total Ventas: ${document.getElementById("printTotalVentas").textContent}`, 105, 30);
    doc.text(`Productos Vendidos: ${document.getElementById("printTotalProductos").textContent}`, 105, 40);

    let yPosition = 50;

    if (obtenerValoresFiltros().incluirGrafico) {
        doc.text("Ventas por Fecha", 10, yPosition);
        yPosition += 10;
        const canvas = document.getElementById("ventasChart");
        if (canvas) {
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 10, yPosition, 190, 80);
            yPosition += 90;
        } else {
            console.error("Canvas 'ventasChart' no encontrado para PDF");
        }
    }

    doc.text("Detalle de Ventas", 10, yPosition);
    yPosition += 10;
    doc.autoTable({
        startY: yPosition,
        head: [['Fecha', 'Vendedor', 'Cliente', 'Producto', 'Cantidad', 'Total']],
        body: ultimoReporte.ventas.map(venta => [
            venta.fecha ? new Date(venta.fecha).toLocaleDateString('es-CL') : 'N/A',
            venta.usuarioNombre,
            venta.clienteNombre,
            venta.productoNombre,
            venta.cantidad.toLocaleString(),
            formatearMoneda(venta.total)
        ])
    });

    doc.save("Informe_Ventas.pdf");
}

/* Exportar a Excel */
function exportarExcel() {
    if (!ultimoReporte) {
        mostrarNotificacion("No hay reporte para exportar", "error");
        return;
    }

    if (!window.XLSX) {
        console.error("XLSX no está cargado");
        mostrarNotificacion("Error: Biblioteca XLSX no disponible", "error");
        return;
    }

    try {
        // Datos para la hoja de Excel
        const data = [
            ["Informe de Ventas"],
            ["Resumen"],
            ["Periodo", document.getElementById("printPeriodo").textContent, "", "Producto", document.getElementById("printProducto").textContent],
            ["Vendedor", document.getElementById("printVendedor").textContent, "", "Total Ventas", document.getElementById("printTotalVentas").textContent],
            ["Cliente", document.getElementById("printCliente").textContent, "", "Productos Vendidos", document.getElementById("printTotalProductos").textContent],
            [],
            ["Detalle de Ventas"],
            ["Fecha", "Vendedor", "Cliente", "Producto", "Cantidad", "Total"],
            ...ultimoReporte.ventas.map(venta => [
                venta.fecha ? new Date(venta.fecha).toLocaleDateString('es-CL') : 'N/A',
                venta.usuarioNombre,
                venta.clienteNombre,
                venta.productoNombre,
                venta.cantidad,
                formatearMoneda(venta.total)
            ])
        ];

        // Crear hoja de trabajo
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Ajustar el ancho de las columnas
        const colWidths = [];
        data.forEach(row => {
            row.forEach((cell, i) => {
                const cellLength = cell ? cell.toString().length : 0;
                colWidths[i] = Math.max(colWidths[i] || 10, cellLength + 2);
            });
        });
        ws['!cols'] = colWidths.map(w => ({ wch: w }));

        // Aplicar formato a las celdas
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellAddress = { c: C, r: R };
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                if (!ws[cellRef]) continue;

                // Centrar todas las celdas
                ws[cellRef].s = {
                    alignment: { horizontal: 'center', vertical: 'center' }
                };

                // Formato de moneda para la columna "Total" (columna F, índice 5)
                if (C === 5 && R >= 7) {
                    ws[cellRef].z = '$#,##0';
                }
            }
        }

        // Hacer que los encabezados sean más destacados
        const headerRows = [0, 1, 6, 7];
        headerRows.forEach(row => {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellAddress = { c: C, r: row };
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                if (ws[cellRef]) {
                    ws[cellRef].s = {
                        alignment: { horizontal: 'center', vertical: 'center' },
                        font: { bold: true }
                    };
                }
            }
        });

        // Crear libro y agregar la hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Informe");

        // Escribir archivo
        XLSX.writeFile(wb, "Informe_Ventas.xlsx");
        mostrarNotificacion("Reporte exportado a Excel", "success");
    } catch (error) {
        console.error("Error al exportar a Excel:", error);
        mostrarNotificacion("Error al exportar a Excel: " + error.message, "error");
    }
}

/* Generar reporte */
async function generarReporte(token) {
    const filtros = obtenerValoresFiltros();
    console.log("Filtros aplicados:", filtros); // Depuración
    try {
        const reporte = await obtenerDatosReporte(
            token,
            filtros.fechaDesde,
            filtros.fechaHasta,
            filtros.productoId,
            filtros.usuarioId,
            filtros.clienteId
        );
        console.log("Datos del reporte:", reporte); // Depuración
        mostrarResultados(reporte);
        mostrarNotificacion("Reporte generado con éxito", "success");
    } catch (error) {
        console.error("Error al generar reporte:", error);
        mostrarNotificacion(error.message || "Error al generar reporte", "error");
    }
}

/* Función para mostrar notificaciones */
function mostrarNotificacion(mensaje, tipo = "info") {
    const notificacion = document.createElement("div");
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(notificacion);

    setTimeout(() => notificacion.classList.add("show"), 10);
    setTimeout(() => {
        notificacion.classList.remove("show");
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

/* Inicializar la página */
document.addEventListener("DOMContentLoaded", initReportes);