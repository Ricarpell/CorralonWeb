// Variables globales
let carrito = [];
let productos = [];
let categorias = [];
let clientes = [];
let sortColumnProductos = null;
let sortDirectionProductos = 'asc';
let sortColumnVentas = null;
let sortDirectionVentas = 'asc';
let carritoEdicion = [];
let ventaIdEdicion = null;
const API_URL = 'https://corralon-backend.onrender.com';

// Decodificar token para obtener UsuarioId
function getUsuarioIdFromToken(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return parseInt(payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']);
    } catch (error) {
        console.error("Error al decodificar token:", error);
        return null;
    }
}

// Función principal de inicialización
function initVentas() {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("No se encontró el token, redirigiendo a login");
        window.location.href = "index.html";
        return;
    }
    // Cargar carrito desde localStorage
    const carritoGuardado = localStorage.getItem("carrito");
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
    }

    // Asignar eventos
    asignarEventos();

    // Cargar datos iniciales
    cargarDatos(token).catch(error => {
        console.error("Error inicial:", error);
        mostrarNotificacion("Error al cargar datos iniciales", "error");
    });

    // Mostrar carrito inicial
    mostrarCarrito();

    // Cargar historial de ventas
    cargarHistorialVentas(token).catch(error => {
        console.error("Error al cargar historial:", error);
        mostrarNotificacion("Error al cargar historial de ventas", "error");
    });
}

// Función para asignar eventos
function asignarEventos() {
    // Filtro de categoría
    document.getElementById("filtroCategoria")?.addEventListener("change", () => {
        renderizarProductos();
    });

    // Búsqueda de productos
    document.getElementById("buscarProducto")?.addEventListener("input", () => {
        renderizarProductos();
    });

    // Botón de confirmar venta
    document.getElementById("confirmarVenta")?.addEventListener("click", confirmarVenta);

    // Botón de guardar cambios en edición
    document.getElementById("guardarVenta")?.addEventListener("click", guardarVentaEditada);

    // Botón de agregar producto en el modal
    document.getElementById("agregarProductoBtn")?.addEventListener("click", agregarProductoEdicion);

    // Cerrar modal
    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".modal");
            if (modal) {
                modal.classList.remove("show");
                if (modal.id === "modalEditarVenta") {
                    // Limpiar carrito de edición al cerrar
                    carritoEdicion = [];
                    ventaIdEdicion = null;
                    document.getElementById("agregarProductoId").value = "";
                }
            }
        });
    });

    // Evento para ordenar listaProductos
    document.querySelectorAll('#listaProductos thead th').forEach((header, index) => {
        if (index < 4) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const columnKey = getColumnKeyProductos(index);
                if (sortColumnProductos === columnKey) {
                    sortDirectionProductos = sortDirectionProductos === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumnProductos = columnKey;
                    sortDirectionProductos = 'asc';
                }
                renderizarProductos();
            });
        }
    });

    // Evento para ordenar historialVentas
    document.querySelectorAll('#historialVentas thead th').forEach((header, index) => {
        if (index < 4) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const columnKey = getColumnKeyVentas(index);
                if (sortColumnVentas === columnKey) {
                    sortDirectionVentas = sortDirectionVentas === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumnVentas = columnKey;
                    sortDirectionVentas = 'asc';
                }
                cargarHistorialVentas(localStorage.getItem("token"));
            });
        }
    });

    // Eventos dinámicos para productos y carrito
    asignarEventosDinamicos();
}

// Función para mapear índices de columnas a claves para listaProductos
function getColumnKeyProductos(index) {
    const columnMap = {
        0: 'nombre',
        1: 'categoria',
        2: 'stock',
        3: 'precio'
    };
    return columnMap[index];
}

// Función para mapear índices de columnas a claves para historialVentas
function getColumnKeyVentas(index) {
    const columnMap = {
        0: 'id',
        1: 'fecha',
        2: 'cliente',
        3: 'total'
    };
    return columnMap[index];
}

// Función para cargar datos
async function cargarDatos(token) {
    try {
        const [productosResponse, categoriasResponse, clientesResponse] = await Promise.all([
            fetch(`${API_URL}/api/Productos`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/api/Categorias`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/api/Clientes`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (!productosResponse.ok) throw new Error("Error al cargar productos");
        if (!categoriasResponse.ok) throw new Error("Error al cargar categorías");
        if (!clientesResponse.ok) throw new Error("Error al cargar clientes");

        productos = await productosResponse.json();
        categorias = await categoriasResponse.json();
        clientes = await clientesResponse.json();

        // Llenar filtros
        llenarFiltroCategorias();
        llenarSelectClientes();
        llenarSelectClientesEdicion();
        llenarSelectProductosEdicion();
        renderizarProductos();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        throw error;
    }
}

// Función para llenar el select de categorías
function llenarFiltroCategorias() {
    const select = document.getElementById("filtroCategoria");
    select.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(categoria => {
        const option = document.createElement("option");
        option.value = categoria.id;
        option.textContent = categoria.nombre;
        select.appendChild(option);
    });
}

// Función para llenar el select de clientes
function llenarSelectClientes() {
    const select = document.getElementById("clienteId");
    select.innerHTML = '<option value="">Sin cliente</option>';
    clientes.forEach(cliente => {
        const option = document.createElement("option");
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        select.appendChild(option);
    });
}

// Función para llenar el select de clientes en el modal de edición
function llenarSelectClientesEdicion() {
    const select = document.getElementById("editarClienteId");
    select.innerHTML = '<option value="">Sin cliente</option>';
    clientes.forEach(cliente => {
        const option = document.createElement("option");
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        select.appendChild(option);
    });
}

// Función para llenar el select de productos en el modal de edición
function llenarSelectProductosEdicion() {
    const select = document.getElementById("agregarProductoId");
    select.innerHTML = '<option value="">Seleccione un producto</option>';
    productos.forEach(producto => {
        if (producto.stock > 0) {
            const option = document.createElement("option");
            option.value = producto.id;
            option.textContent = `${producto.nombre} (Stock: ${producto.stock}, Precio: $${producto.precio.toLocaleString('es-CL')})`;
            select.appendChild(option);
        }
    });
}

// Función para renderizar productos
function renderizarProductos() {
    const categoriaId = document.getElementById("filtroCategoria").value;
    const busqueda = document.getElementById("buscarProducto").value.toLowerCase();
    const tbody = document.querySelector("#listaProductos tbody");

    let productosFiltrados = productos.filter(producto => {
        const coincideCategoria = !categoriaId || producto.categoriaId === parseInt(categoriaId);
        const coincideBusqueda = !busqueda || producto.nombre.toLowerCase().includes(busqueda);
        return coincideCategoria && coincideBusqueda;
    });

    if (sortColumnProductos) {
        productosFiltrados.sort((a, b) => {
            let valueA, valueB;
            switch (sortColumnProductos) {
                case 'nombre':
                    valueA = a.nombre.toLowerCase();
                    valueB = b.nombre.toLowerCase();
                    break;
                case 'categoria':
                    valueA = categorias.find(c => c.id === a.categoriaId)?.nombre?.toLowerCase() || '';
                    valueB = categorias.find(c => c.id === b.categoriaId)?.nombre?.toLowerCase() || '';
                    break;
                case 'stock':
                    valueA = a.stock;
                    valueB = b.stock;
                    break;
                case 'precio':
                    valueA = a.precio;
                    valueB = b.precio;
                    break;
                default:
                    return 0;
            }
            if (valueA < valueB) return sortDirectionProductos === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortDirectionProductos === 'asc' ? 1 : -1;
            return 0;
        });
    }

    tbody.innerHTML = productosFiltrados.length === 0
        ? `<tr><td colspan="5" class="empty-table">No hay productos</td></tr>`
        : productosFiltrados.map(producto => `
            <tr>
                <td>${producto.nombre}</td>
                <td><span class="categoria-badge">${categorias.find(c => c.id === producto.categoriaId)?.nombre || 'N/A'}</span></td>
                <td class="stock-cell ${producto.stock === 0 ? 'stock-low' : ''}">${producto.stock.toLocaleString('es-CL')}</td>
                <td class="price-cell">$${producto.precio.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>
                    <button class="btn btn-primary btn-sm btn-agregar" data-id="${producto.id}" ${producto.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </td>
            </tr>
        `).join('');

    actualizarEncabezadosProductos();
}

// Función para actualizar los encabezados de listaProductos
function actualizarEncabezadosProductos() {
    const headers = document.querySelectorAll('#listaProductos thead th');
    headers.forEach((header, index) => {
        header.classList.remove('sort-asc', 'sort-desc');
        const columnKey = getColumnKeyProductos(index);
        if (columnKey === sortColumnProductos) {
            header.classList.add(sortDirectionProductos === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Función para guardar carrito en localStorage
function guardarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
}

// Función para agregar al carrito principal
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto || producto.stock === 0) {
        mostrarNotificacion("Producto no disponible", "error");
        return;
    }

    const itemCarrito = carrito.find(item => item.id === productoId);
    if (itemCarrito) {
        if (itemCarrito.cantidad >= producto.stock) {
            mostrarNotificacion("No hay suficiente stock", "error");
            return;
        }
        itemCarrito.cantidad++;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }

    guardarCarrito();
    mostrarCarrito();
    mostrarNotificacion(`${producto.nombre} agregado al carrito`, "success");
}

// Función para agregar un producto al carrito de edición
function agregarProductoEdicion() {
    console.log("Clic en Agregar Producto");
    const select = document.getElementById("agregarProductoId");
    const productoId = parseInt(select.value);
    if (!productoId) {
        mostrarNotificacion("Seleccione un producto", "error");
        return;
    }

    const producto = productos.find(p => p.id === productoId);
    if (!producto || producto.stock === 0) {
        mostrarNotificacion("Producto no disponible", "error");
        return;
    }

    const itemCarrito = carritoEdicion.find(item => item.id === productoId);
    if (itemCarrito) {
        if (itemCarrito.cantidad >= producto.stock) {
            mostrarNotificacion("No hay suficiente stock", "error");
            return;
        }
        itemCarrito.cantidad++;
    } else {
        carritoEdicion.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: 1
        });
    }

    select.value = "";
    mostrarCarritoEdicion();
    mostrarNotificacion(`${producto.nombre} agregado a la venta`, "success");
}

// Función para mostrar el carrito principal
function mostrarCarrito() {
    const carritoDiv = document.getElementById("carrito");
    const totalSpan = document.getElementById("total");

    if (carrito.length === 0) {
        carritoDiv.innerHTML = '<p class="empty-cart">No hay productos en el carrito</p>';
        totalSpan.textContent = "0.00";
        return;
    }

    carritoDiv.innerHTML = carrito.map(item => `
        <div class="carrito-item">
            <div class="carrito-item-info">
                <span>${item.nombre}</span>
                <span>$${item.precio.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x ${item.cantidad}</span>
            </div>
            <div class="carrito-item-acciones">
                <button class="btn btn-primary btn-sm btn-cantidad btn-aumentar" data-id="${item.id}">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-secondary btn-sm btn-cantidad btn-disminuir" data-id="${item.id}">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    totalSpan.textContent = total.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Función para mostrar el carrito de edición
function mostrarCarritoEdicion() {
    console.log("Mostrando carrito de edición:", carritoEdicion);
    const carritoDiv = document.getElementById("editarCarrito");
    const totalSpan = document.getElementById("editarTotal");

    if (!carritoDiv) {
        console.error("Elemento #editarCarrito no encontrado");
        return;
    }

    if (carritoEdicion.length === 0) {
        carritoDiv.innerHTML = '<p class="empty-cart">No hay productos en el carrito</p>';
        totalSpan.textContent = "0.00";
        return;
    }

    carritoDiv.innerHTML = carritoEdicion.map(item => `
        <div class="carrito-item">
            <div class="carrito-item-info">
                <span>${item.nombre}</span>
                <span>$${item.precio.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x ${item.cantidad}</span>
            </div>
            <div class="carrito-item-acciones">
                <button class="btn btn-primary btn-sm btn-cantidad btn-aumentar-edicion" data-id="${item.id}">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="btn btn-secondary btn-sm btn-cantidad btn-disminuir-edicion" data-id="${item.id}">
                    <i class="fas fa-minus"></i>
                </button>
                <button class="btn btn-danger btn-sm btn-eliminar-edicion" data-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    const total = carritoEdicion.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    totalSpan.textContent = total.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    console.log("Carrito de edición renderizado, total:", total);
}

// Función para modificar cantidad en el carrito principal
function modificarCantidad(productoId, accion) {
    const item = carrito.find(item => item.id === productoId);
    const producto = productos.find(p => p.id === productoId);

    if (!item || !producto) return;

    if (accion === "aumentar") {
        if (item.cantidad >= producto.stock) {
            mostrarNotificacion("No hay suficiente stock", "error");
            return;
        }
        item.cantidad++;
    } else if (accion === "disminuir") {
        item.cantidad--;
        if (item.cantidad === 0) {
            carrito = carrito.filter(i => i.id !== productoId);
        }
    }

    guardarCarrito();
    mostrarCarrito();
}

// Función para modificar cantidad en el carrito de edición
function modificarCantidadEdicion(productoId, accion) {
    console.log(`Modificando cantidad, productoId: ${productoId}, acción: ${accion}`);
    const item = carritoEdicion.find(item => item.id === productoId);
    if (!item) {
        console.error("Producto no encontrado en carritoEdicion:", productoId);
        return;
    }

    // Validar stock contra el producto original
    const producto = productos.find(p => p.id === productoId);
    if (!producto) {
        mostrarNotificacion("Producto no encontrado", "error");
        return;
    }

    if (accion === "aumentar") {
        if (item.cantidad >= producto.stock) {
            mostrarNotificacion("No hay suficiente stock", "error");
            return;
        }
        item.cantidad++;
    } else if (accion === "disminuir") {
        item.cantidad--;
        if (item.cantidad === 0) {
            carritoEdicion = carritoEdicion.filter(i => i.id !== productoId);
        }
    }

    mostrarCarritoEdicion();
}

// Función para eliminar del carrito principal
function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(item => item.id !== productoId);
    guardarCarrito();
    mostrarCarrito();
}

// Función para eliminar del carrito de edición
function eliminarDelCarritoEdicion(productoId) {
    console.log("Eliminando producto de carritoEdicion:", productoId);
    carritoEdicion = carritoEdicion.filter(item => item.id !== productoId);
    mostrarCarritoEdicion();
}

// Función para confirmar la venta
async function confirmarVenta() {
    if (carrito.length === 0) {
        mostrarNotificacion("El carrito está vacío", "error");
        return;
    }

    const token = localStorage.getItem("token");
    const usuarioId = getUsuarioIdFromToken(token);
    if (!usuarioId) {
        mostrarNotificacion("Error al obtener el usuario autenticado", "error");
        return;
    }

    const clienteId = document.getElementById("clienteId").value;
    if (!confirm("¿Confirmar la venta?")) return;

    try {
        const response = await fetch(`${API_URL}/api/Ventas`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuarioId: usuarioId,
                clienteId: clienteId ? parseInt(clienteId) : null,
                detalles: carrito.map(item => ({
                    productoId: item.id,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio
                }))
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al procesar la venta");
        }

        carrito = [];
        guardarCarrito();
        mostrarCarrito();
        document.getElementById("clienteId").value = "";

        mostrarNotificacion("Venta realizada con éxito", "success");

        await cargarDatos(token);
        renderizarProductos();
        await cargarHistorialVentas(token);
    } catch (error) {
        console.error("Error al confirmar venta:", error);
        mostrarNotificacion(error.message || "Error al procesar la venta", "error");
    }
}

// Función para cargar el historial de ventas
async function cargarHistorialVentas(token) {
    try {
        const response = await fetch(`${API_URL}/api/Ventas`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Error al cargar historial");

        let ventas = await response.json();

        if (sortColumnVentas) {
            ventas.sort((a, b) => {
                let valueA, valueB;
                switch (sortColumnVentas) {
                    case 'id':
                        valueA = a.id;
                        valueB = b.id;
                        break;
                    case 'fecha':
                        valueA = new Date(a.fecha);
                        valueB = new Date(b.fecha);
                        break;
                    case 'cliente':
                        valueA = (a.nombreCliente || 'Sin cliente').toLowerCase();
                        valueB = (b.nombreCliente || 'Sin cliente').toLowerCase();
                        break;
                    case 'total':
                        valueA = a.total;
                        valueB = b.total;
                        break;
                    default:
                        return 0;
                }
                if (valueA < valueB) return sortDirectionVentas === 'asc' ? -1 : 1;
                if (valueA > valueB) return sortDirectionVentas === 'asc' ? 1 : -1;
                return 0;
            });
        }

        renderizarHistorialVentas(ventas);
    } catch (error) {
        console.error("Error al cargar historial:", error);
        throw error;
    }
}

// Función para renderizar el historial de ventas
function renderizarHistorialVentas(ventas) {
    const tbody = document.querySelector("#historialVentas tbody");
    tbody.innerHTML = ventas.length === 0
        ? `<tr><td colspan="5" class="empty-table">No hay ventas</td></tr>`
        : ventas.map(venta => `
            <tr>
                <td>${venta.id}</td>
                <td>${new Date(venta.fecha).toLocaleDateString('es-CL')}</td>
                <td>${venta.nombreCliente || 'Sin cliente'}</td>
                <td style="text-align: right;">$${venta.total.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>
                    <button class="btn btn-primary btn-sm btn-detalle" data-id="${venta.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-warning btn-sm btn-editar" data-id="${venta.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    actualizarEncabezadosVentas();
}

// Función para actualizar los encabezados de historialVentas
function actualizarEncabezadosVentas() {
    const headers = document.querySelectorAll('#historialVentas thead th');
    headers.forEach((header, index) => {
        header.classList.remove('sort-asc', 'sort-desc');
        const columnKey = getColumnKeyVentas(index);
        if (columnKey === sortColumnVentas) {
            header.classList.add(sortDirectionVentas === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Función para mostrar detalle de venta
async function mostrarDetalleVenta(id) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/Ventas/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Error al cargar detalle de venta");

        const venta = await response.json();

        document.getElementById("ventaId").textContent = venta.id;
        document.getElementById("ventaFecha").textContent = new Date(venta.fecha).toLocaleString('es-CL');
        document.getElementById("ventaVendedor").textContent = venta.usuarioNombre || "N/A";
        document.getElementById("ventaCliente").textContent = venta.nombreCliente || "Sin cliente";
        document.getElementById("ventaTotal").textContent = venta.total.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const tbody = document.getElementById("detalleVentaProductos");
        tbody.innerHTML = venta.detalles.map(detalle => `
            <tr>
                <td>${detalle.productoNombre}</td>
                <td>${detalle.cantidad.toLocaleString('es-CL')}</td>
                <td>$${detalle.precioUnitario.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>$${detalle.subtotal.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

        document.getElementById("modalDetalleVenta").classList.add("show");
    } catch (error) {
        console.error("Error al mostrar detalle:", error);
        mostrarNotificacion("Error al cargar detalle de venta", "error");
    }
}

// Función para abrir el modal de edición de venta
async function abrirEditarVenta(id) {
    console.log(`Intentando abrir edición para venta ID: ${id}`);
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/Ventas/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        console.log(`Respuesta GET /api/Ventas/${id}:`, response.status, response.statusText);        if (!response.ok) {
            let errorMessage = "Error al cargar datos de la venta";
            try {
                const errorData = await response.json();
                errorMessage = errorData.Message || errorData.message || errorMessage;
            } catch {
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const venta = await response.json();
        console.log("Datos de la venta cargados:", JSON.stringify(venta, null, 2));

        // Guardar ID de la venta en edición
        ventaIdEdicion = venta.id;
        document.getElementById("editarVentaId").textContent = venta.id;

        // Precargar cliente
        const selectCliente = document.getElementById("editarClienteId");
        if (!selectCliente) {
            console.error("Elemento #editarClienteId no encontrado");
            throw new Error("No se encontró el selector de clientes");
        }
        selectCliente.value = venta.clienteId ? venta.clienteId : "";
        console.log("Cliente seleccionado:", selectCliente.value);

        // Precargar productos en carritoEdicion con validación mejorada
        carritoEdicion = venta.detalles
            .filter(detalle => {
                const isValid =
                    typeof detalle.productoId === 'number' && detalle.productoId > 0 &&
                    typeof detalle.cantidad === 'number' && detalle.cantidad > 0 &&
                    typeof detalle.precioUnitario === 'number' && detalle.precioUnitario > 0;
                if (!isValid) {
                    console.warn("Detalle inválido filtrado:", JSON.stringify(detalle, null, 2), {
                        productoIdValid: typeof detalle.productoId === 'number' && detalle.productoId > 0,
                        cantidadValid: typeof detalle.cantidad === 'number' && detalle.cantidad > 0,
                        precioUnitarioValid: typeof detalle.precioUnitario === 'number' && detalle.precioUnitario > 0
                    });
                }
                return isValid;
            })
            .map(detalle => ({
                id: detalle.productoId,
                nombre: detalle.productoNombre || 'Desconocido',
                precio: detalle.precioUnitario,
                cantidad: detalle.cantidad
            }))
            .filter(item => {
                const producto = productos.find(p => p.id === item.id);
                if (!producto) {
                    console.warn(`Producto con ID ${item.id} no encontrado en lista de productos`);
                    return false;
                }
                return true;
            });

        if (carritoEdicion.length === 0 && venta.detalles.length > 0) {
            console.warn("Todos los detalles de la venta fueron filtrados por datos inválidos:", JSON.stringify(venta.detalles, null, 2));
            mostrarNotificacion("No se pudieron cargar los productos de la venta debido a datos inválidos", "error");
        } else if (carritoEdicion.length < venta.detalles.length) {
            console.warn(`Se filtraron ${venta.detalles.length - carritoEdicion.length} detalles inválidos de ${venta.detalles.length}`);
            mostrarNotificacion("Algunos productos de la venta no pudieron cargarse debido a datos inválidos", "warning");
        }
        console.log("Carrito de edición precargado:", JSON.stringify(carritoEdicion, null, 2));

        // Mostrar carrito de edición
        mostrarCarritoEdicion();

        // Mostrar modal
        const modal = document.getElementById("modalEditarVenta");
        if (!modal) {
            console.error("Elemento #modalEditarVenta no encontrado");
            throw new Error("No se encontró el modal de edición");
        }
        modal.classList.add("show");
        console.log("Modal de edición abierto");
    } catch (error) {
        console.error("Error al abrir edición:", error);
        mostrarNotificacion(error.message || "Error al cargar datos de la venta", "error");
    }
}

// Función para guardar la venta editada
async function guardarVentaEditada() {
    console.log("Iniciando guardarVentaEditada, ventaId:", ventaIdEdicion);

    // Obtener token al inicio y validar
    const token = localStorage.getItem("token");
    console.log("Token obtenido:", token ? "[presente]" : "null");
    if (!token) {
        mostrarNotificacion("No se encontró el token de autenticación", "error");
        console.error("Error: Token no encontrado en localStorage");
        return;
    }

    // Validar carritoEdicion
    if (carritoEdicion.length === 0) {
        mostrarNotificacion("El carrito de edición está vacío", "error");
        console.log("Error: Carrito de edición vacío");
        return;
    }

    // Validar cada item en carritoEdicion según el esquema de VentaCreacionDto
    for (const item of carritoEdicion) {
        if (!item.id || isNaN(item.id) || item.id <= 0) {
            mostrarNotificacion(`Producto inválido: ${item.nombre}`, "error");
            console.error("Error: productoId inválido:", item);
            return;
        }
        if (!item.cantidad || isNaN(item.cantidad) || item.cantidad <= 0) {
            mostrarNotificacion(`Cantidad inválida para ${item.nombre}`, "error");
            console.error("Error: Cantidad inválida:", item);
            return;
        }
        if (!item.precio || isNaN(item.precio) || item.precio <= 0) {
            mostrarNotificacion(`Precio inválido para ${item.nombre}`, "error");
            console.error("Error: Precio inválido:", item);
            return;
        }
        // Validar que el producto exista en la lista de productos
        const producto = productos.find(p => p.id === item.id);
        if (!producto) {
            mostrarNotificacion(`El producto ${item.nombre} (ID: ${item.id}) no existe`, "error");
            console.error("Error: Producto no encontrado en lista de productos:", item);
            return;
        }
        if (item.cantidad > producto.stock) {
            mostrarNotificacion(`Stock insuficiente para ${item.nombre}. Stock disponible: ${producto.stock}`, "error");
            console.error("Error: Stock insuficiente:", item, "Stock:", producto.stock);
            return;
        }
    }

    // Obtener usuarioId
    const usuarioId = getUsuarioIdFromToken(token);
    console.log("UsuarioId obtenido:", usuarioId);
    if (!usuarioId) {
        mostrarNotificacion("Error al obtener el usuario autenticado", "error");
        console.log("Error: No se pudo obtener usuarioId");
        return;
    }

    // Obtener clienteId
    const clienteId = document.getElementById("editarClienteId").value;
    const requestBody = {
        usuarioId: usuarioId,
        clienteId: clienteId ? parseInt(clienteId) : null,
        detalles: carritoEdicion.map(item => ({
            productoId: item.id,
            cantidad: item.cantidad,
            precioUnitario: item.precio
        }))
    };
    console.log("Datos a enviar:", JSON.stringify(requestBody, null, 2));

    // Confirmar acción
    if (!confirm("¿Guardar los cambios en la venta?")) {
        console.log("Edición cancelada por el usuario");
        return;
    }

    try {
        console.log("Enviando solicitud PUT...");
        const response = await fetch(`${API_URL}/api/Ventas/${ventaIdEdicion}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        console.log(`Respuesta PUT /api/Ventas/${ventaIdEdicion}:`, response.status, response.statusText);

        if (!response.ok) {
            let errorMessage = "Error al actualizar la venta";
            try {
                const errorData = await response.json();
                errorMessage = errorData.Message || errorData.message || errorMessage;
            } catch (jsonError) {
                // Manejar respuesta no JSON
                const errorText = await response.text();
                console.error("Respuesta de error no es JSON:", errorText);
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        // Limpiar carrito de edición y cerrar modal
        carritoEdicion = [];
        ventaIdEdicion = null;
        document.getElementById("agregarProductoId").value = "";
        document.getElementById("modalEditarVenta").classList.remove("show");
        console.log("Modal cerrado, edición guardada");

        mostrarNotificacion("Venta actualizada con éxito", "success");

        // Actualizar lista de productos y historial
        await cargarDatos(token);
        renderizarProductos();
        await cargarHistorialVentas(token);
        console.log("Datos y historial actualizados");
    } catch (error) {
        console.error("Error al guardar venta editada:", error);
        mostrarNotificacion(error.message || "Error al actualizar la venta", "error");
    }
}

// Función para asignar eventos dinámicos
function asignarEventosDinamicos() {
    // Productos (carrito principal)
    document.getElementById("listaProductos")?.addEventListener("click", e => {
        const btnAgregar = e.target.closest(".btn-agregar");
        if (btnAgregar) {
            const id = parseInt(btnAgregar.dataset.id);
            agregarAlCarrito(id);
        }
    });

    // Carrito principal
    document.getElementById("carrito")?.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains("btn-aumentar")) {
            modificarCantidad(id, "aumentar");
        } else if (btn.classList.contains("btn-disminuir")) {
            modificarCantidad(id, "disminuir");
        } else if (btn.classList.contains("btn-eliminar")) {
            eliminarDelCarrito(id);
        }
    });

    // Carrito de edición
    document.getElementById("editarCarrito")?.addEventListener("click", e => {
        const btn = e.target.closest("button");
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains("btn-aumentar-edicion")) {
            console.log("Clic en aumentar edición, ID:", id);
            modificarCantidadEdicion(id, "aumentar");
        } else if (btn.classList.contains("btn-disminuir-edicion")) {
            console.log("Clic en disminuir edición, ID:", id);
            modificarCantidadEdicion(id, "disminuir");
        } else if (btn.classList.contains("btn-eliminar-edicion")) {
            console.log("Clic en eliminar edición, ID:", id);
            eliminarDelCarritoEdicion(id);
        }
    });

    // Historial
    document.getElementById("historialVentas")?.addEventListener("click", e => {
        const btnDetalle = e.target.closest(".btn-detalle");
        const btnEditar = e.target.closest(".btn-editar");
        if (btnDetalle) {
            const id = parseInt(btnDetalle.dataset.id);
            console.log("Clic en detalle, ID:", id);
            mostrarDetalleVenta(id);
        }
        if (btnEditar) {
            const id = parseInt(btnEditar.dataset.id);
            console.log("Clic en editar, ID:", id);
            abrirEditarVenta(id);
        }
    });
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = "info") {
    const notificacion = document.createElement("div");
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : tipo === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(notificacion);

    setTimeout(() => notificacion.classList.add("show"), 10);
    setTimeout(() => {
        notificacion.classList.remove("show");
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}

// Inicializar la página
initVentas();