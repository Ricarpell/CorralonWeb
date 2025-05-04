const productos = [];
const categorias = [];
let isSubmitting = false;
let productSort = { column: 'nombre', direction: 'asc' };
let categorySort = { column paint: 'nombre', direction: 'asc' };
let productFilter = '';
let categoryFilter = '';

const formatter = new Intl.NumberFormat('es-CL', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function initAdmin() {
    const token = localStorage.getItem("token");
    if (!token) {
        console.log("No se encontró token, redirigiendo a index.html");
        window.location.href = "index.html";
        return;
    }

    asignarEventosPrincipales();
    asignarEventosDinamicos();
    cargarDatos(token).catch(error => {
        console.error("Error inicial:", error);
        mostrarNotificacion("Error al cargar datos iniciales", "error");
    });
}

function asignarEventosPrincipales() {
    document.getElementById("nuevaCategoriaBtn")?.addEventListener("click", () => abrirModalCategoria());
    document.getElementById("nuevoProductoBtn")?.addEventListener("click", () => abrirModalProducto());
    document.getElementById("nuevaCategoriaDesdeProducto")?.addEventListener("click", () => abrirModalCategoria());

    const formCategoria = document.getElementById("formCategoria");
    formCategoria?.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!isSubmitting) guardarCategoria(localStorage.getItem("token"));
    }, { once: false });

    const formProducto = document.getElementById("formProducto");
    formProducto?.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!isSubmitting) guardarProducto(localStorage.getItem("token"));
    }, { once: false });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.classList.remove('show');
        });
    });

    document.getElementById("productoSearch")?.addEventListener("input", (e) => {
        productFilter = e.target.value.toLowerCase();
        renderizarProductos();
    });

    document.getElementById("categoriaSearch")?.addEventListener("input", (e) => {
        categoryFilter = e.target.value.toLowerCase();
        renderizarCategorias();
    });

    document.querySelectorAll("#listaProductos thead th[data-sort]").forEach(header => {
        header.addEventListener("click", () => {
            const column = header.dataset.sort;
            if (productSort.column === column) {
                productSort.direction = productSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                productSort.column = column;
                productSort.direction = 'asc';
            }
            renderizarProductos();
        });
    });

    document.querySelectorAll("#listaCategorias thead th[data-sort]").forEach(header => {
        header.addEventListener("click", () => {
            const column = header.dataset.sort;
            if (categorySort.column === column) {
                categorySort.direction = categorySort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                categorySort.column = column;
                categorySort.direction = 'asc';
            }
            renderizarCategorias();
        });
    });
}

const API_URL = 'https://corralon-backend.onrender.com';

async function cargarDatos(token) {
    try {
        console.log("Cargando datos...");
        const [productosResponse, categoriasResponse] = await Promise.all([
            fetch(`${API_URL}/api/Productos`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Cache-Control": "no-cache"
                }
            }),
            fetch(`${API_URL}/api/Categorias`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Cache-Control": "no-cache"
                }
            })
        ]);

        if (!productosResponse.ok) throw new Error("Error al cargar productos");
        if (!categoriasResponse.ok) throw new Error("Error al cargar categorías");

        const nuevosProductos = await productosResponse.json();
        const nuevasCategorias = await categoriasResponse.json();

        productos.length = 0;
        categorias.length = 0;
        productos.push(...nuevosProductos);
        categorias.push(...nuevasCategorias);

        console.log("Productos cargados:", nuevosProductos);
        nuevosProductos.forEach(p => {
            console.log(`Producto: ${p.nombre}, Precio: ${p.precio}, Stock: ${p.stock}`);
        });

        renderizarProductos();
        renderizarCategorias();
        llenarSelectCategorias();

        console.log("Arrays actualizados:", { productos, categorias });
    } catch (error) {
        console.error("Error al cargar datos:", error);
        throw error;
    }
}

function sortItems(items, sortConfig, getValue) {
    return [...items].sort((a, b) => {
        let valueA = getValue(a, sortConfig.column);
        let valueB = getValue(b, sortConfig.column);

        if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function renderizarProductos() {
    const tbody = document.querySelector("#listaProductos tbody");
    tbody.innerHTML = "";

    const filteredProductos = productos.filter(producto =>
        producto.nombre.toLowerCase().includes(productFilter)
    );

    if (filteredProductos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-table">No hay productos</td></tr>`;
        return;
    }

    const sortedProductos = sortItems(filteredProductos, productSort, (producto, column) => {
        if (column === 'categoria') {
            const categoria = categorias.find(c => c.id === producto.categoriaId) || { nombre: "Sin categoría" };
            return categoria.nombre;
        }
        return producto[column] || 0;
    });

    document.querySelectorAll("#listaProductos thead th[data-sort]").forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.sort === productSort.column) {
            header.classList.add(`sort-${productSort.direction}`);
        }
    });

    sortedProductos.forEach(producto => {
        const categoria = categorias.find(c => c.id === producto.categoriaId) || { nombre: "Sin categoría" };
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${producto.nombre}</td>
            <td>${categoria.nombre}</td>
            <td>$${formatter.format(producto.precio || 0)}</td>
            <td class="${producto.stock <= 5 ? 'stock-low' : ''}">${producto.stock}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm btn-action btn-editar" data-id="${producto.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-action btn-eliminar" data-id="${producto.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderizarCategorias() {
    const tbody = document.querySelector("#listaCategorias tbody");
    tbody.innerHTML = "";

    const filteredCategorias = categorias.filter(categoria =>
        categoria.nombre.toLowerCase().includes(categoryFilter)
    );

    if (filteredCategorias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="empty-table">No hay categorías</td></tr>`;
        return;
    }

    const sortedCategorias = sortItems(filteredCategorias, categorySort, (categoria, column) => {
        if (column === 'productos') {
            return productos.filter(p => p.categoriaId === categoria.id).length;
        }
        return categoria[column];
    });

    document.querySelectorAll("#listaCategorias thead th[data-sort]").forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (header.dataset.sort === categorySort.column) {
            header.classList.add(`sort-${categorySort.direction}`);
        }
    });

    sortedCategorias.forEach(categoria => {
        const count = productos.filter(p => p.categoriaId === categoria.id).length;
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${categoria.nombre}</td>
            <td>${count}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm btn-action btn-editar" data-id="${categoria.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-action btn-eliminar" data-id="${categoria.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function llenarSelectCategorias() {
    const select = document.getElementById("productoCategoria");
    select.innerHTML = categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
}

function abrirModalProducto(id = null) {
    const modal = document.getElementById("modalProducto");
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
            document.getElementById("productoPrecio").value = (producto.precio || 0).toFixed(2);
            document.getElementById("productoStock").value = producto.stock;
        }
    } else {
        title.textContent = "Nuevo Producto";
        document.getElementById("productoPrecio").value = "0.00";
        document.getElementById("productoStock").value = "0";
    }

    modal.classList.add("show");
}

function abrirModalCategoria(id = null) {
    const modal = document.getElementById("modalCategoria");
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

    modal.classList.add("show");
}

async function guardarProducto(token) {
    if (isSubmitting) return;
    isSubmitting = true;

    const id = document.getElementById("productoId").value;
    const nombre = document.getElementById("productoNombre").value;
    const categoriaId = parseInt(document.getElementById("productoCategoria").value);
    const precio = parseFloat(document.getElementById("productoPrecio").value) || 0;
    const stock = parseInt(document.getElementById("productoStock").value) || 0;

    const producto = { id: id ? parseInt(id) : 0, nombre, categoriaId, precio, stock };
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/api/Productos/${id}` : `${API_URL}/api/Productos`;

    console.log(`Guardando producto:`, producto);

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
        document.getElementById("modalProducto").classList.remove("show");
        mostrarNotificacion(`Producto ${id ? 'actualizado' : 'creado'} con éxito`, "success");
    } catch (error) {
        console.error("Error al guardar producto:", error);
        mostrarNotificacion(error.message || "Error al guardar producto", "error");
    } finally {
        isSubmitting = false;
    }
}

async function guardarCategoria(token) {
    if (isSubmitting) return;
    isSubmitting = true;

    const id = document.getElementById("categoriaId").value;
    const nombre = document.getElementById("categoriaNombre").value;
    const categoria = { id: id ? parseInt(id) : 0, nombre };
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
        document.getElementById("modalCategoria").classList.remove("show");
        // Mantener el modal de producto abierto y actualizar el select de categorías
        const modalProducto = document.getElementById("modalProducto");
        if (modalProducto.classList.contains("show")) {
            llenarSelectCategorias();
            // Seleccionar la nueva categoría si fue creada
            const nuevaCategoria = categorias.find(c => c.nombre === nombre);
            if (nuevaCategoria) {
                document.getElementById("productoCategoria").value = nuevaCategoria.id;
            }
        }
        mostrarNotificacion(`Categoría ${id ? 'actualizada' : 'creada'} con éxito`, "success");
    } catch (error) {
        console.error("Error al guardar categoría:", error);
        mostrarNotificacion(error.message || "Error al guardar categoría", "error");
    } finally {
        isSubmitting = false;
    }
}

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

async function eliminarCategoria(id, token) {
    if (!confirm("¿Estás seguro de eliminar esta categoría?")) return;

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

function asignarEventosDinamicos() {
    document.getElementById("listaProductos").addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;

        const id = parseInt(target.dataset.id);
        const token = localStorage.getItem("token");

        if (target.classList.contains("btn-editar")) {
            abrirModalProducto(id);
        } else if (target.classList.contains("btn-eliminar")) {
            eliminarProducto(id, token);
        }
    });

    document.getElementById("listaCategorias").addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;

        const id = parseInt(target.dataset.id);
        const token = localStorage.getItem("token");

        if (target.classList.contains("btn-editar")) {
            abrirModalCategoria(id);
        } else if (target.classList.contains("btn-eliminar")) {
            eliminarCategoria(id, token);
        }
    });
}

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

initAdmin();