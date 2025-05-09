// Variables del módulo
const productos = [];
const categorias = [];
const clientes = [];
const carrito = [];
const ventas = [];
let carritoEdicion = [];
const API_URL = window.location.hostname === "localhost" 
    ? "http://localhost:5000" 
    : "https://corralon-backend.onrender.com";

// Función para decodificar el token JWT
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1]; // Obtener el payload del token
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Error al decodificar el token:", error);
        return null;
    }
}

// Función para abrir un modal
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("show");
    } else {
        console.error(`Modal con ID ${modalId} no encontrado`);
    }
}

// Función para cerrar un modal
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("show");
        const form = modal.querySelector("form");
        if (form) form.reset();
        if (modalId === "modalEditarVenta") {
            carritoEdicion = []; // Limpiar carrito de edición
            actualizarCarritoEdicion();
        }
    } else {
        console.error(`Modal con ID ${modalId} no encontrado`);
    }
}

// Función principal de inicialización
function initVentas() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Validar si el token es válido y no está expirado
    const decodedToken = decodeJWT(token);
    if (!decodedToken) {
        localStorage.removeItem("token");
        mostrarNotificacion("Token inválido. Por favor, inicia sesión nuevamente.", "error");
        window.location.href = "index.html";
        return;
    }

    const exp = decodedToken.exp;
    if (exp && Date.now() >= exp * 1000) {
        localStorage.removeItem("token");
        mostrarNotificacion("Sesión expirada. Por favor, inicia sesión nuevamente.", "error");
        window.location.href = "index.html";
        return;
    }

    // Asignar eventos estáticos
    asignarEventosPrincipales();

    // Cargar datos iniciales
    cargarDatos(token).catch(error => {
        console.error("Error inicial:", error);
        mostrarNotificacion("Error al cargar datos iniciales", "error");
    });
}

// Función para asignar eventos estáticos
function asignarEventosPrincipales() {
    // Filtros
    document.getElementById("filtroCategoria")?.addEventListener("change", filtrarProductos);
    document.getElementById("buscarProducto")?.addEventListener("input", filtrarProductos);

    // Botón de confirmar venta
    document.getElementById("confirmarVenta")?.addEventListener("click", () => confirmarVenta(localStorage.getItem("token")));

    // Botones de cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) cerrarModal(modal.id);
        });
    });

    // Clic fuera del modal
    window.addEventListener("click", (event) => {
        const modal = document.querySelector(".modal.show");
        if (modal && event.target === modal) {
            cerrarModal(modal.id);
        }
    });

    // Botón para agregar producto en edición
    document.getElementById("agregarProductoBtn")?.addEventListener("click", () => {
        const productoId = parseInt(document.getElementById("agregarProductoId").value);
        if (productoId) {
            agregarProductoEdicion(productoId);
        }
    });

    // Botón para guardar cambios en edición
    document.getElementById("guardarVenta")?.addEventListener("click", () => guardarVentaEditada(localStorage.getItem("token")));
}

// Función para cargar datos iniciales
async function cargarDatos(token) {
    try {
        const [productosResponse, categoriasResponse, clientesResponse, ventasResponse] = await Promise.all([
            fetch(`${API_URL}/api/Productos`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/api/Categorias`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/api/Clientes`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/api/Ventas`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (!productosResponse.ok || !categoriasResponse.ok || !clientesResponse.ok || !ventasResponse.ok) {
            throw new Error("Error al cargar datos");
        }

        const nuevosProductos = await productosResponse.json();
        const nuevasCategorias = await categoriasResponse.json();
        const nuevosClientes = await clientesResponse.json();
        const nuevasVentas = await ventasResponse.json();

        productos.length = 0;
        categorias.length = 0;
        clientes.length = 0;
        ventas.length = 0;

        productos.push(...nuevosProductos);
        categorias.push(...nuevasCategorias);
        clientes.push(...nuevosClientes);
        ventas.push(...nuevasVentas);

        renderizarProductos();
        actualizarSelectCategorias();
        actualizarSelectClientes();
        actualizarSelectProductosEdicion();
        renderizarHistorial();
        actualizarCarrito();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        throw error;
    }
}

// Función para renderizar productos
function renderizarProductos() {
    const tbody = document.querySelector("#listaProductos tbody");
    tbody.innerHTML = "";

    if (productos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-table">No hay productos</td></tr>`;
        return;
    }

    productos.forEach(producto => {
        const categoria = categorias.find(c => c.id === producto.categoriaId);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${categoria ? categoria.nombre : 'Sin categoría'}</span></td>
            <td class="stock-cell ${producto.stock < 10 ? 'stock-low' : ''}">${producto.stock}</td>
            <td>$${producto.precio.toFixed(2)}</td>
            <td>
                <button class="btn btn-primary btn-sm btn-action btn-agregar" data-id="${producto.id}">
                    <i class="fas fa-plus"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    asignarEventosProductos();
}

// Función para actualizar el select de categorías
function actualizarSelectCategorias() {
    const select = document.getElementById("filtroCategoria");
    select.innerHTML = '<option value="">Todas</option>';
    categorias.forEach(categoria => {
        select.innerHTML += `<option value="${categoria.id}">${categoria.nombre}</option>`;
    });
}

// Función para actualizar el select de clientes
function actualizarSelectClientes() {
    const select = document.getElementById("clienteId");
    const selectEdicion = document.getElementById("editarClienteId");
    const options = '<option value="">Sin cliente</option>' + 
        clientes.map(cliente => `<option value="${cliente.id}">${cliente.nombre}</option>`).join('');
    
    select.innerHTML = options;
    selectEdicion.innerHTML = options;
}

// Función para actualizar el select de productos en edición
function actualizarSelectProductosEdicion() {
    const select = document.getElementById("agregarProductoId");
    select.innerHTML = '<option value="">Seleccione un producto</option>' + 
        productos.map(producto => `<option value="${producto.id}">${producto.nombre}</option>`).join('');
}

// Función para renderizar historial de ventas
function renderizarHistorial() {
    const tbody = document.querySelector("#historialVentas tbody");
    tbody.innerHTML = "";

    if (ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-table">No hay ventas</td></tr>`;
        return;
    }

    ventas.forEach(venta => {
        const cliente = clientes.find(c => c.id === venta.clienteId);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${venta.id}</td>
            <td class="fecha-venta">${new Date(venta.fecha).toLocaleDateString()}</td>
            <td>${cliente ? cliente.nombre : 'Sin cliente'}</td>
            <td>$${venta.total.toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-sm btn-action btn-detalle" data-id="${venta.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-primary btn-sm btn-action btn-editar" data-id="${venta.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-action btn-eliminar" data-id="${venta.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    asignarEventosHistorial();
}

// Función para asignar eventos a productos
function asignarEventosProductos() {
    document.querySelectorAll(".btn-agregar").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            agregarProducto(id);
        });
    });
}

// Función para asignar eventos al historial
function asignarEventosHistorial() {
    document.querySelectorAll(".btn-detalle").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            mostrarDetalleVenta(id);
        });
    });

    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            abrirModalEditarVenta(id);
        });
    });

    document.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            eliminarVenta(id, localStorage.getItem("token"));
        });
    });
}

// Función para agregar producto al carrito
function agregarProducto(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto || producto.stock <= 0) {
        mostrarNotificacion("Producto no disponible o sin stock", "error");
        return;
    }

    const item = carrito.find(i => i.productoId === productoId);
    if (item) {
        if (item.cantidad >= producto.stock) {
            mostrarNotificacion("No hay suficiente stock", "error");
            return;
        }
        item.cantidad++;
    } else {
        carrito.push({ productoId, cantidad: 1, precio: producto.precio });
    }

    actualizarCarrito();
}

// Función para actualizar el carrito
function actualizarCarrito() {
    const carritoDiv = document.getElementById("carrito");
    const totalSpan = document.getElementById("total");
    carritoDiv.innerHTML = "";

    if (carrito.length === 0) {
        carritoDiv.innerHTML = `<p class="empty-cart">No hay productos en el carrito</p>`;
        totalSpan.textContent = "0.00";
        return;
    }

    let total = 0;
    carrito.forEach(item => {
        const producto = productos.find(p => p.id === item.productoId);
        if (!producto) return;

        const subtotal = item.cantidad * item.precio;
        total += subtotal;

        const div = document.createElement("div");
        div.className = "carrito-item";
        div.innerHTML = `
            <span>${producto.nombre}</span>
            <div class="cantidad-control">
                <button class="btn btn-sm btn-secondary" onclick="cambiarCantidad(${item.productoId}, -1)">-</button>
                <input type="number" class="cantidad-input" value="${item.cantidad}" min="1" max="${producto.stock}" onchange="actualizarCantidad(${item.productoId}, this.value)">
                <button class="btn btn-sm btn-secondary" onclick="cambiarCantidad(${item.productoId}, 1)">+</button>
            </div>
            <span class="carrito-subtotal">$${subtotal.toFixed(2)}</span>
            <button class="btn btn-danger btn-sm" onclick="eliminarDelCarrito(${item.productoId})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        carritoDiv.appendChild(div);
    });

    totalSpan.textContent = total.toFixed(2);
}

// Función para cambiar cantidad en el carrito
window.cambiarCantidad = function(productoId, cambio) {
    const item = carrito.find(i => i.productoId === productoId);
    const producto = productos.find(p => p.id === productoId);
    if (!item || !producto) return;

    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad < 1) {
        eliminarDelCarrito(productoId);
        return;
    }
    if (nuevaCantidad > producto.stock) {
        mostrarNotificacion("No hay suficiente stock", "error");
        return;
    }

    item.cantidad = nuevaCantidad;
    actualizarCarrito();
};

// Función para actualizar cantidad manualmente
window.actualizarCantidad = function(productoId, value) {
    const cantidad = parseInt(value);
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    if (isNaN(cantidad) || cantidad < 1) {
        eliminarDelCarrito(productoId);
        return;
    }
    if (cantidad > producto.stock) {
        mostrarNotificacion("No hay suficiente stock", "error");
        return;
    }

    const item = carrito.find(i => i.productoId === productoId);
    if (item) {
        item.cantidad = cantidad;
        actualizarCarrito();
    }
};

// Función para eliminar del carrito
window.eliminarDelCarrito = function(productoId) {
    const index = carrito.findIndex(i => i.productoId === productoId);
    if (index !== -1) {
        carrito.splice(index, 1);
        actualizarCarrito();
    }
};

// Función para confirmar venta
async function confirmarVenta(token) {
    if (carrito.length === 0) {
        mostrarNotificacion("El carrito está vacío", "error");
        return;
    }

    const clienteId = document.getElementById("clienteId").value;
    const detalles = carrito.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precio
    }));

    // Decodificar el token para obtener el usuarioId
    const decodedToken = decodeJWT(token);
    const usuarioId = decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || null;

    if (!usuarioId) {
        console.error("No se encontró usuarioId en el token. Payload:", decodedToken);
        mostrarNotificacion("No se pudo identificar al usuario autenticado. Verifique su sesión.", "error");
        return;
    }

    const venta = {
        clienteId: clienteId ? parseInt(clienteId) : null,
        usuarioId: parseInt(usuarioId), // Agregar el usuarioId
        detalles
    };

    try {
        const response = await fetch(`${API_URL}/api/Ventas`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(venta)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al registrar venta");
        }

        carrito.length = 0;
        await cargarDatos(token);
        mostrarNotificacion("Venta registrada con éxito", "success");
    } catch (error) {
        console.error("Error al registrar venta:", error);
        mostrarNotificacion(error.message || "Error al registrar venta", "error");
    }
}

// Función para mostrar detalle de venta
async function mostrarDetalleVenta(id) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/Ventas/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al cargar detalle de venta");
        }

        const venta = await response.json();
        const cliente = clientes.find(c => c.id === venta.clienteId);

        document.getElementById("ventaId").textContent = venta.id;
        document.getElementById("ventaFecha").textContent = new Date(venta.fecha).toLocaleString();
        document.getElementById("ventaVendedor").textContent = venta.vendedor || "N/A";
        document.getElementById("ventaCliente").textContent = cliente ? cliente.nombre : "Sin cliente";
        document.getElementById("ventaTotal").textContent = venta.total.toFixed(2);

        const tbody = document.getElementById("detalleVentaProductos");
        tbody.innerHTML = "";
        venta.detalles.forEach(detalle => {
            const producto = productos.find(p => p.id === detalle.productoId);
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${producto ? producto.nombre : 'Producto eliminado'}</td>
                <td class="carrito-cantidad">${detalle.cantidad}</td>
                <td>${detalle.precioUnitario.toFixed(2)}</td>
                <td class="carrito-subtotal">$${detalle.cantidad * detalle.precioUnitario.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });

        abrirModal("modalDetalleVenta");
    } catch (error) {
        console.error("Error al cargar detalle de venta:", error);
        mostrarNotificacion(error.message || "Error al cargar detalle de venta", "error");
    }
}

// Función para abrir el modal de edición de venta
async function abrirModalEditarVenta(id) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/Ventas/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al cargar venta");
        }

        const venta = await response.json();
        document.getElementById("editarVentaId").textContent = venta.id;
        document.getElementById("editarClienteId").value = venta.clienteId || "";

        carritoEdicion = venta.detalles.map(detalle => ({
            productoId: detalle.productoId,
            cantidad: detalle.cantidad,
            precio: detalle.precioUnitario
        }));

        actualizarCarritoEdicion();
        abrirModal("modalEditarVenta");
    } catch (error) {
        console.error("Error al cargar venta:", error);
        mostrarNotificacion(error.message || "Error al cargar venta", "error");
    }
}

// Función para agregar producto al carrito de edición
function agregarProductoEdicion(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto || producto.stock <= 0) {
        mostrarNotificacion("Producto no disponible o sin stock", "error");
        return;
    }

    const item = carritoEdicion.find(i => i.productoId === productoId);
    if (item) {
        if (item.cantidad >= producto.stock) {
            mostrarNotificacion("No hay suficiente stock", "error");
            return;
        }
        item.cantidad++;
    } else {
        carritoEdicion.push({ productoId, cantidad: 1, precio: producto.precio });
    }

    actualizarCarritoEdicion();
}

// Función para actualizar el carrito de edición
function actualizarCarritoEdicion() {
    const carritoDiv = document.getElementById("editarCarrito");
    const totalSpan = document.getElementById("editarTotal");
    carritoDiv.innerHTML = "";

    if (carritoEdicion.length === 0) {
        carritoDiv.innerHTML = `<p class="empty-cart">No hay productos en el carrito</p>`;
        totalSpan.textContent = "0.00";
        return;
    }

    let total = 0;
    carritoEdicion.forEach(item => {
        const producto = productos.find(p => p.id === item.productoId);
        if (!producto) return;

        const subtotal = item.cantidad * item.precio;
        total += subtotal;

        const div = document.createElement("div");
        div.className = "carrito-item";
        div.innerHTML = `
            <span>${producto.nombre}</span>
            <div class="cantidad-control">
                <button class="btn btn-sm btn-secondary" onclick="cambiarCantidadEdicion(${item.productoId}, -1)">-</button>
                <input type="number" class="cantidad-input" value="${item.cantidad}" min="1" max="${producto.stock}" onchange="actualizarCantidadEdicion(${item.productoId}, this.value)">
                <button class="btn btn-sm btn-secondary" onclick="cambiarCantidadEdicion(${item.productoId}, 1)">+</button>
            </div>
            <span class="carrito-subtotal">$${subtotal.toFixed(2)}</span>
            <button class="btn btn-danger btn-sm" onclick="eliminarDeCarritoEdicion(${item.productoId})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        carritoDiv.appendChild(div);
    });

    totalSpan.textContent = total.toFixed(2);
}

// Función para cambiar cantidad en el carrito de edición
window.cambiarCantidadEdicion = function(productoId, cambio) {
    const item = carritoEdicion.find(i => i.productoId === productoId);
    const producto = productos.find(p => p.id === productoId);
    if (!item || !producto) return;

    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad < 1) {
        eliminarDeCarritoEdicion(productoId);
        return;
    }
    if (nuevaCantidad > producto.stock) {
        mostrarNotificacion("No hay suficiente stock", "error");
        return;
    }

    item.cantidad = nuevaCantidad;
    actualizarCarritoEdicion();
};

// Función para actualizar cantidad manualmente en edición
window.actualizarCantidadEdicion = function(productoId, value) {
    const cantidad = parseInt(value);
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;

    if (isNaN(cantidad) || cantidad < 1) {
        eliminarDeCarritoEdicion(productoId);
        return;
    }
    if (cantidad > producto.stock) {
        mostrarNotificacion("No hay suficiente stock", "error");
        return;
    }

    const item = carritoEdicion.find(i => i.productoId === productoId);
    if (item) {
        item.cantidad = cantidad;
        actualizarCarritoEdicion();
    }
};

// Función para eliminar del carrito de edición
window.eliminarDeCarritoEdicion = function(productoId) {
    const index = carritoEdicion.findIndex(i => i.productoId === productoId);
    if (index !== -1) {
        carritoEdicion.splice(index, 1);
        actualizarCarritoEdicion();
    }
};

// Función para guardar venta editada
async function guardarVentaEditada(token) {
    if (carritoEdicion.length === 0) {
        mostrarNotificacion("El carrito está vacío", "error");
        return;
    }

    const id = parseInt(document.getElementById("editarVentaId").textContent);
    const clienteId = document.getElementById("editarClienteId").value;
    const detalles = carritoEdicion.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precio
    }));

    // Decodificar el token para obtener el usuarioId
    const decodedToken = decodeJWT(token);
    const usuarioId = decodedToken?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || null;

    if (!usuarioId) {
        console.error("No se encontró usuarioId en el token. Payload:", decodedToken);
        mostrarNotificacion("No se pudo identificar al usuario autenticado. Verifique su sesión.", "error");
        return;
    }

    const venta = {
        id,
        clienteId: clienteId ? parseInt(clienteId) : null,
        usuarioId: parseInt(usuarioId), // Agregar el usuarioId
        detalles
    };

    try {
        const response = await fetch(`${API_URL}/api/Ventas/${id}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(venta)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al actualizar venta");
        }

        carritoEdicion = [];
        await cargarDatos(token);
        cerrarModal("modalEditarVenta");
        mostrarNotificacion("Venta actualizada con éxito", "success");
    } catch (error) {
        console.error("Error al actualizar venta:", error);
        mostrarNotificacion(error.message || "Error al actualizar venta", "error");
    }
}

// Función para eliminar venta
async function eliminarVenta(id, token) {
    if (!confirm("¿Estás seguro de eliminar esta venta?")) return;

    try {
        const response = await fetch(`${API_URL}/api/Ventas/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al eliminar venta");
        }

        await cargarDatos(token);
        mostrarNotificacion("Venta eliminada con éxito", "success");
    } catch (error) {
        console.error("Error al eliminar venta:", error);
        mostrarNotificacion(error.message || "Error al eliminar venta", "error");
    }
}

// Función para filtrar productos
function filtrarProductos() {
    const categoriaId = document.getElementById("filtroCategoria").value;
    const search = document.getElementById("buscarProducto").value.toLowerCase();

    let filtered = productos;
    if (categoriaId) {
        filtered = filtered.filter(p => p.categoriaId === parseInt(categoriaId));
    }
    if (search) {
        filtered = filtered.filter(p => p.nombre.toLowerCase().includes(search));
    }

    productos.length = 0;
    productos.push(...filtered);
    renderizarProductos();
}

// Función para mostrar notificaciones
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

// Inicializar la página
initVentas();