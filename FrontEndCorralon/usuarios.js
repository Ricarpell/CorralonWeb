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

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Verificar rol de usuario
    function getUserRole() {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log("Token decodificado:", payload);
            return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
        } catch (e) {
            console.error("Error al decodificar token:", e);
            return '';
        }
    }

    if (getUserRole() !== 'Admin') {
        window.location.href = "dashboard.html";
        return;
    }

    // Cargar lista de usuarios
    loadUsers();

    // Manejar creación de usuario
    document.getElementById("createUserForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = document.getElementById("createUsername").value;
        const password = document.getElementById("createPassword").value;
        const role = document.getElementById("createRole").value;
        const submitBtn = event.target.querySelector("button[type='submit']");

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Creando...';

        try {
            const response = await fetch(`${API_URL}/api/Auth/registrar`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ nombreUsuario: username, contraseña: password, rol: role })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Error al crear usuario");
            }

            mostrarNotificacion("Usuario creado exitosamente", "success");
            cerrarModal("createUserModal");
            loadUsers();
        } catch (error) {
            console.error("Error al crear usuario:", error);
            mostrarNotificacion(error.message || "Error al crear usuario", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Crear Usuario";
        }
    });

    // Manejar edición de usuario
    document.getElementById("editUserForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const id = document.getElementById("editUserId").value;
        const password = document.getElementById("editPassword").value;
        const role = document.getElementById("editRole").value;
        const submitBtn = event.target.querySelector("button[type='submit']");

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Guardando...';

        try {
            let url = `${API_URL}/api/Usuarios/${id}`;
            console.log(`Enviando PUT a ${url} con cuerpo:`, { contraseña: password, rol: role });
            let response = await fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ contraseña: password, rol: role })
            });

            if (response.status === 404) {
                url = `${API_URL}/api/Usuarios/update/${id}`;
                console.log(`Reintentando PUT a ${url} debido a 404`);
                response = await fetch(url, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ contraseña: password, rol: role })
                });
            }

            console.log(`Respuesta PUT: Status=${response.status}, StatusText=${response.statusText}, Headers:`, [...response.headers]);
            if (!response.ok) {
                let errorData;
                try {
                    const text = await response.text();
                    console.log("Cuerpo de la respuesta de error:", text || "Vacío");
                    errorData = text ? JSON.parse(text) : { message: `Error HTTP ${response.status}: ${response.statusText || 'No encontrado'}` };
                } catch (e) {
                    errorData = { message: `Error HTTP ${response.status}: ${response.statusText || 'No encontrado'}` };
                }
                console.error("Error en PUT:", errorData);
                throw new Error(errorData.message || `Error al actualizar usuario (HTTP ${response.status})`);
            }

            const responseData = await response.json();
            console.log("Respuesta exitosa del PUT:", responseData);
            mostrarNotificacion("Usuario actualizado exitosamente", "success");
            cerrarModal("editUserModal");
            loadUsers();
        } catch (error) {
            console.error("Error en editUserForm:", error);
            mostrarNotificacion(error.message || "Error al actualizar usuario", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Guardar Cambios";
        }
    });

    // Configurar botón de nuevo usuario
    document.getElementById("crearUsuarioBtn")?.addEventListener("click", () => {
        abrirModal("createUserModal");
    });

    // Configurar cierre de modales
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
});

// Cargar usuarios
async function loadUsers() {
    const token = localStorage.getItem("token");
    try {
        console.log("Enviando solicitud a", `${API_URL}/api/Usuarios`);
        const response = await fetch(`${API_URL}/api/Usuarios`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error en respuesta de /api/Usuarios:", errorData);
            throw new Error(errorData.message || "Error al cargar usuarios");
        }

        const users = await response.json();
        console.log("Respuesta completa de /api/Usuarios:", JSON.stringify(users, null, 2));
        const tbody = document.getElementById("usersTableBody");
        if (!tbody) {
            console.error("Elemento #usersTableBody no encontrado en el DOM");
            return;
        }
        tbody.innerHTML = "";

        users.forEach(user => {
            const rol = user.rol || user.Rol || user.role || "Sin rol definido";
            console.log(`Procesando usuario: ID=${user.id}, Nombre=${user.nombre}, Rol=${rol}`);
            if (!user.rol && !user.Rol && !user.role) {
                console.warn(`Advertencia: El campo 'rol' no está definido para el usuario ${user.nombre}`);
            }
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.nombre}</td>
                <td>${rol}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary btn-sm btn-action btn-editar" data-id="${user.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger btn-sm btn-action btn-eliminar" data-id="${user.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Asignar eventos a botones dinámicos
        asignarEventosBotones();
    } catch (error) {
        console.error("Error al cargar usuarios:", error);
        mostrarNotificacion(error.message || "Error al cargar usuarios", "error");
    }
}

// Función para asignar eventos a botones dinámicos
function asignarEventosBotones() {
    document.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            abrirModalEditarUsuario(id);
        });
    });

    document.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            eliminarUsuario(id);
        });
    });
}

// Función para abrir el modal de edición de usuario
async function abrirModalEditarUsuario(id) {
    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/Usuarios/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al cargar datos del usuario");
        }

        const user = await response.json();
        console.log("Datos del usuario cargado:", user);

        document.getElementById("editUserId").value = user.id;
        document.getElementById("editUsername").value = user.nombre;
        document.getElementById("editPassword").value = "";
        document.getElementById("editRole").value = user.rol || user.Rol || user.role || "User";

        abrirModal("editUserModal");
    } catch (error) {
        console.error("Error al cargar usuario:", error);
        mostrarNotificacion(error.message || "Error al cargar usuario", "error");
    }
}

// Función para eliminar usuario
async function eliminarUsuario(id) {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    const token = localStorage.getItem("token");
    try {
        const response = await fetch(`${API_URL}/api/Usuarios/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error al eliminar usuario");
        }

        mostrarNotificacion("Usuario eliminado exitosamente", "success");
        loadUsers();
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        mostrarNotificacion(error.message || "Error al eliminar usuario", "error");
    }
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