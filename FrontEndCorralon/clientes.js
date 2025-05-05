// Variables del módulo
const clientes = [];
let isSubmitting = false;
const API_URL = window.location.hostname === "localhost" 
    ? "http://localhost:5000" 
    : "https://corralon-backend.onrender.com";
    
// Función principal de inicialización
function initClientes() {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Asignar eventos estáticos
    asignarEventosPrincipales();

    // Asignar eventos dinámicos una sola vez
    asignarEventosDinamicos();

    // Cargar datos iniciales
    cargarDatos(token).catch(error => {
        console.error("Error inicial:", error);
        mostrarNotificacion("Error al cargar datos iniciales", "error");
    });
}

// Función para asignar eventos estáticos
function asignarEventosPrincipales() {
    // Botón principal
    document.getElementById("nuevoClienteBtn")?.addEventListener("click", () => abrirModalCliente());

    // Formulario
    const formCliente = document.getElementById("formCliente");
    formCliente?.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!isSubmitting) guardarCliente(localStorage.getItem("token"));
    }, { once: false });

    // Botones de cerrar modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) modal.classList.remove('show');
        });
    });
}

// Función para cargar datos iniciales
async function cargarDatos(token) {
    try {
        const response = await fetch(`${API_URL}/api/Clientes`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Error al cargar clientes");

        const nuevosClientes = await response.json();
        clientes.length = 0;
        clientes.push(...nuevosClientes);

        renderizarClientes();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        throw error;
    }
}

// Función para renderizar clientes
function renderizarClientes() {
    const tbody = document.querySelector("#listaClientes tbody");
    tbody.innerHTML = "";

    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-table">No hay clientes</td></tr>`;
        return;
    }

    clientes.forEach(cliente => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${cliente.nombre}</td>
            <td>${cliente.email}</td>
            <td>${cliente.telefono || 'N/A'}</td>
            <td>${cliente.direccion || 'N/A'}</td>
            <td>${new Date(cliente.fechaRegistro).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm btn-action btn-editar" data-id="${cliente.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm btn-action btn-eliminar" data-id="${cliente.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Función para abrir el modal de cliente
function abrirModalCliente(id = null) {
    const modal = document.getElementById("modalCliente");
    const title = document.getElementById("modalClienteTitle");
    const form = document.getElementById("formCliente");

    form.reset();
    document.getElementById("clienteId").value = "";

    if (id) {
        const cliente = clientes.find(c => c.id === id);
        if (cliente) {
            title.textContent = "Editar Cliente";
            document.getElementById("clienteId").value = cliente.id;
            document.getElementById("clienteNombre").value = cliente.nombre;
            document.getElementById("clienteEmail").value = cliente.email;
            document.getElementById("clienteTelefono").value = cliente.telefono || '';
            document.getElementById("clienteDireccion").value = cliente.direccion || '';
        }
    } else {
        title.textContent = "Nuevo Cliente";
    }

    modal.classList.add("show");
}

// Función para validar email
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Función para guardar cliente
async function guardarCliente(token) {
    if (isSubmitting) return;
    isSubmitting = true;

    const id = document.getElementById("clienteId").value;
    const nombre = document.getElementById("clienteNombre").value.trim();
    const email = document.getElementById("clienteEmail").value.trim();
    const telefono = document.getElementById("clienteTelefono").value.trim();
    const direccion = document.getElementById("clienteDireccion").value.trim();

    // Validar email
    if (!validarEmail(email)) {
        mostrarNotificacion("Por favor, ingresa un email válido", "error");
        isSubmitting = false;
        return;
    }

    const cliente = {
        id: id ? parseInt(id) : 0,
        nombre,
        email,
        telefono: telefono || null,
        direccion: direccion || null
    };

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/api/Clientes/${id}` : `${API_URL}/api/Clientes`;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cliente)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al guardar cliente");
        }

        await cargarDatos(token);
        document.getElementById("modalCliente").classList.remove("show");
        mostrarNotificacion(`Cliente ${id ? 'actualizado' : 'creado'} con éxito`, "success");
    } catch (error) {
        console.error("Error al guardar cliente:", error);
        mostrarNotificacion(error.message || "Error al guardar cliente", "error");
    } finally {
        isSubmitting = false;
    }
}

// Función para eliminar cliente
async function eliminarCliente(id, token) {
    if (!confirm("¿Estás seguro de eliminar este cliente?")) return;

    try {
        const response = await fetch(`${API_URL}/api/Clientes/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al eliminar cliente");
        }

        await cargarDatos(token);
        mostrarNotificacion("Cliente eliminado con éxito", "success");
    } catch (error) {
        console.error("Error al eliminar cliente:", error);
        mostrarNotificacion(error.message || "Error al eliminar cliente", "error");
    }
}

// Función para asignar eventos dinámicos
function asignarEventosDinamicos() {
    document.getElementById("listaClientes").addEventListener("click", (e) => {
        const target = e.target.closest("button");
        if (!target) return;

        const id = parseInt(target.dataset.id);
        const token = localStorage.getItem("token");

        if (target.classList.contains("btn-editar")) {
            abrirModalCliente(id);
        } else if (target.classList.contains("btn-eliminar")) {
            eliminarCliente(id, token);
        }
    });
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
initClientes();