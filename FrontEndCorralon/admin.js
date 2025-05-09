// Variables del módulo
const productos = [];
const categorias = [];
const API_URL = window.location.hostname === "localhost" 
    ? "http://localhost:5000" 
    : "https://corralon-backend.onrender.com";

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
    } else {
        console.error(`Modal con ID ${modalId} no encontrado`);
    }
}

// Función principal de inicialización
function initAdmin() {
    const token = localStorage.getItem("token");
    if (!token) {
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
    // Botones principales
    document.getElementById("nuevoProductoBtn")?.addEventListener("click", () => abrirModalProducto());
    document.getElementById("nuevaCategoriaBtn")?.addEventListener("click", () => abrirModalCategoria());

    // Formularios
    document.getElementById("formProducto")?.addEventListener("submit", (e) => {
        e.preventDefault();
        guardarProducto(localStorage.getItem("token"));
    });

    document.getElementById("formCategoria")?.addEventListener("submit", (e) => {
        e.preventDefault();
        guardarCategoria(localStorage.getItem("token"));
    });

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

    // Búsqueda
    document.getElementById("productoSearch")?.addEventListener("input", filtrarProductos);
    document.getElementById("categoriaSearch")?.addEventListener("input", filtrarCategorias);
}

// Función para cargar datos iniciales
async function cargarDatos(token) {
    try {
        const [productosResponse, categoriasResponse] = await Promise.all([
            fetch(`${API_URL}/api/Productos`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/api/Categorias`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);

        if (!productosResponse.ok || !categoriasResponse.ok) {
            throw new Error("Error al cargar datos");
        }

        const nuevosProductos = await productosResponse.json();
        const nuevasCategorias = await categoriasResponse.json();

        productos.length = 0;
        categorias.length = 0;
        productos.push(...nuevosProductos);
        categorias.push(...nuevasCategorias);

        renderizarProductos();
        renderizarCategorias();
        actualizarSelectCategorias();
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
            <td>${categoria ? categoria.nombre : 'Sin categoría'}</td> <!-- Eliminado categoria-badge -->
            <td>$${producto.precio.toFixed(2)}</td> <!-- Eliminado price-cell -->
            <td class="stock-cell ${producto.stock < 10 ? 'stock-low' : ''}">${producto.stock}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm btn-action btn-editar-producto" data-id="${producto.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-action btn-eliminar-producto" data-id="${producto.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    asignarEventosProductos();
}

// Función para renderizar categorías
function renderizarCategorias() {
    const tbody = document.querySelector("#listaCategorias tbody");
    tbody.innerHTML = "";

    if (categorias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-table">No hay categorías</td></tr>`;
        return;
    }

    categorias.forEach(categoria => {
        const cantidadProductos = productos.filter(p => p.categoriaId === categoria.id).length;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${categoria.nombre}</td>
            <td>${cantidadProductos}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm btn-action btn-editar-categoria" data-id="${categoria.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-action btn-eliminar-categoria" data-id="${categoria.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    asignarEventosCategorias();
}

// Función para actualizar el select de categorías
function actualizarSelectCategorias() {
    const select = document.getElementById("productoCategoria");
    select.innerHTML = '<option value="">Seleccione una categoría</option>';
    categorias.forEach(categoria => {
        select.innerHTML += `<option value="${categoria.id}">${categoria.nombre}</option>`;
    });
}

// Función para abrir el modal de producto
function abrirModalProducto(id = null) {
    const modalId = "modalProducto";
    abrirModal(modalId);
    const title = document.getElementById("modalProductoTitle");
    const form = document.getElementById("formProducto");

    form.reset();
    document.getElementById("productoId").value = "";

    if (id) {
        const producto = productos.find(p => p.id === id);
        if (producto) {
            title.textContent = "Editar Producto";
            document.getElementById("productoId").value = producto.id;
            document.getElementById("productoNombre").value = producto.nombre;
            document.getElementById("productoCategoria").value = producto.categoriaId;
            document.getElementById("productoPrecio").value = producto.precio;
            document.getElementById("productoStock").value = producto.stock;
        }
    } else {
        title.textContent = "Nuevo Producto";
    }
}

// Función para abrir el modal de categoría
function abrirModalCategoria(id = null) {
    const modalId = "modalCategoria";
    abrirModal(modalId);
    const title = document.getElementById("modalCategoriaTitle");
    const form = document.getElementById("formCategoria");

    form.reset();
    document.getElementById("categoriaId").value = "";

    if (id) {
        const categoria = categorias.find(c => c.id === id);
        if (categoria) {
            title.textContent = "Editar Categoría";
            document.getElementById("categoriaId").value = categoria.id;
            document.getElementById("categoriaNombre").value = categoria.nombre;
        }
    } else {
        title.textContent = "Nueva Categoría";
    }
}

// Función para guardar producto
async function guardarProducto(token) {
    const id = document.getElementById("productoId").value;
    const nombre = document.getElementById("productoNombre").value.trim();
    const categoriaId = document.getElementById("productoCategoria").value;
    const precio = parseFloat(document.getElementById("productoPrecio").value);
    const stock = parseInt(document.getElementById("productoStock").value);

    if (!nombre || !categoriaId || isNaN(precio) || isNaN(stock)) {
        mostrarNotificacion("Por favor, completa todos los campos correctamente", "error");
        return;
    }

    const producto = {
        id: id ? parseInt(id) : 0,
        nombre,
        categoriaId: parseInt(categoriaId),
        precio,
        stock
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/api/Productos/${id}` : `${API_URL}/api/Productos`;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(producto)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al guardar producto");
        }

        await cargarDatos(token);
        cerrarModal("modalProducto");
        mostrarNotificacion(`Producto ${id ? 'actualizado' : 'creado'} con éxito`, "success");
    } catch (error) {
        console.error("Error al guardar producto:", error);
        mostrarNotificacion(error.message || "Error al guardar producto", "error");
    }
}

// Función para guardar categoría
async function guardarCategoria(token) {
    const id = document.getElementById("categoriaId").value;
    const nombre = document.getElementById("categoriaNombre").value.trim();

    if (!nombre) {
        mostrarNotificacion("Por favor, ingresa un nombre para la categoría", "error");
        return;
    }

    const categoria = {
        id: id ? parseInt(id) : 0,
        nombre
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/api/Categorias/${id}` : `${API_URL}/api/Categorias`;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(categoria)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al guardar categoría");
        }

        await cargarDatos(token);
        cerrarModal("modalCategoria");
        mostrarNotificacion(`Categoría ${id ? 'actualizada' : 'creada'} con éxito`, "success");
    } catch (error) {
        console.error("Error al guardar categoría:", error);
        mostrarNotificacion(error.message || "Error al guardar categoría", "error");
    }
}

// Función para eliminar producto
async function eliminarProducto(id, token) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    try {
        const response = await fetch(`${API_URL}/api/Productos/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al eliminar producto");
        }

        await cargarDatos(token);
        mostrarNotificacion("Producto eliminado con éxito", "success");
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        mostrarNotificacion(error.message || "Error al eliminar producto", "error");
    }
}

// Función para eliminar categoría
async function eliminarCategoria(id, token) {
    if (!confirm("¿Estás seguro de eliminar esta categoría? Los productos asociados quedarán sin categoría.")) return;

    try {
        const response = await fetch(`${API_URL}/api/Categorias/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al eliminar categoría");
        }

        await cargarDatos(token);
        mostrarNotificacion("Categoría eliminada con éxito", "success");
    } catch (error) {
        console.error("Error al eliminar categoría:", error);
        mostrarNotificacion(error.message || "Error al eliminar categoría", "error");
    }
}

// Función para asignar eventos a productos
function asignarEventosProductos() {
    document.querySelectorAll(".btn-editar-producto").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            abrirModalProducto(id);
        });
    });

    document.querySelectorAll(".btn-eliminar-producto").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            eliminarProducto(id, localStorage.getItem("token"));
        });
    });
}

// Función para asignar eventos a categorías
function asignarEventosCategorias() {
    document.querySelectorAll(".btn-editar-categoria").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            abrirModalCategoria(id);
        });
    });

    document.querySelectorAll(".btn-eliminar-categoria").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            eliminarCategoria(id, localStorage.getItem("token"));
        });
    });
}

// Función para filtrar productos
function filtrarProductos() {
    const search = document.getElementById("productoSearch").value.toLowerCase();
    const filtered = productos.filter(p => p.nombre.toLowerCase().includes(search));
    productos.length = 0;
    productos.push(...filtered);
    renderizarProductos();
}

// Función para filtrar categorías
function filtrarCategorias() {
    const search = document.getElementById("categoriaSearch").value.toLowerCase();
    const filtered = categorias.filter(c => c.nombre.toLowerCase().includes(search));
    categorias.length = 0;
    categorias.push(...filtered);
    renderizarCategorias();
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
initAdmin();