const API_URL = window.location.hostname === "localhost" 
    ? "http://localhost:5000" 
    : "https://corralon-backend.onrender.com";

// Función para abrir un modal
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("show");
        console.log(`[DEBUG] Modal ${modalId} abierto con clase .show`);
    } else {
        console.error(`[ERROR] Modal con ID ${modalId} no encontrado en el DOM`);
    }
}

// Función para cerrar un modal
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("show");
        const form = modal.querySelector("form");
        if (form) form.reset();
        console.log(`[DEBUG] Modal ${modalId} cerrado`);
    } else {
        console.error(`[ERROR] Modal con ID ${modalId} no encontrado en el DOM`);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG] DOMContentLoaded disparado");
    const token = localStorage.getItem("token");
    if (!token) {
        console.warn("[DEBUG] No se encontró token, redirigiendo a index.html");
        window.location.href = "index.html";
        return;
    }

    // Verificar rol de usuario
    function getUserRole() {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log("[DEBUG] Token decodificado:", payload);
            return payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || '';
        } catch (e) {
            console.error("[ERROR] Error al decodificar token:", e);
            return '';
        }
    }

    const role = getUserRole();
    if (role !== 'Admin') {
        console.warn("[DEBUG] Rol no es Admin, redirigiendo a dashboard.html");
        window.location.href = "dashboard.html";
        return;
    }

    // Verificar existencia de editUserModal
    const editUserModal = document.getElementById("editUserModal");
    if (!editUserModal) {
        console.error("[ERROR] Elemento #editUserModal no encontrado en el DOM");
    } else {
        console.log("[DEBUG] Elemento #editUserModal encontrado en el DOM");
    }

    // Cargar lista de usuarios
    loadUsers();

    // Manejar creación de usuario
    const createUserForm = document.getElementById("createUserForm");
    if (createUserForm) {
        createUserForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            console.log("[DEBUG] Formulario de creación de usuario enviado");
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
                console.error("[ERROR] Error al crear usuario:", error);
                mostrarNotificacion(error.message || "Error al crear usuario", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Crear Usuario";
            }
        });
    } else {
        console.error("[ERROR] Elemento #createUserForm no encontrado en el DOM");
    }

    // Manejar edición de usuario
    const editUserForm = document.getElementById("editUserForm");
    if (editUserForm) {
        editUserForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            console.log("[DEBUG] Formulario de edición de usuario enviado");
            const id = document.getElementById("editUserId").value;
            const password = document.getElementById("editPassword").value;
            const role = document.getElementById("editRole").value;
            const submitBtn = event.target.querySelector("button[type='submit']");

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Guardando...';

            try {
                let url = `${API_URL}/api/Usuarios/${id}`;
                console.log(`[DEBUG] Enviando PUT a ${url} con cuerpo:`, { contraseña: password, rol: role });
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
                    console.log(`[DEBUG] Reintentando PUT a ${url} debido a 404`);
                    response = await fetch(url, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ contraseña: password, rol: role })
                    });
                }

                console.log(`[DEBUG] Respuesta PUT: Status=${response.status}, StatusText=${response.statusText}, Headers:`, [...response.headers]);
                if (!response.ok) {
                    let errorData;
                    try {
                        const text = await response.text();
                        console.log("[DEBUG] Cuerpo de la respuesta de error:", text || "Vacío");
                        errorData = text ? JSON.parse(text) : { message: `Error HTTP ${response.status}: ${response.statusText || 'No encontrado'}` };
                    } catch (e) {
                        errorData = { message: `Error HTTP ${response.status}: ${response.statusText || 'No encontrado'}` };
                    }
                    console.error("[ERROR] Error en PUT:", errorData);
                    throw new Error(errorData.message || `Error al actualizar usuario (HTTP ${response.status})`);
                }

                const responseData = await response.json();
                console.log("[DEBUG] Respuesta exitosa del PUT:", responseData);
                mostrarNotificacion("Usuario actualizado exitosamente", "success");
                cerrarModal("editUserModal");
                loadUsers();
            } catch (error) {
                console.error("[ERROR] Error en editUserForm:", error);
                mostrarNotificacion(error.message || "Error al actualizar usuario", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Guardar Cambios";
            }
        });
    } else {
        console.error("[ERROR] Elemento #editUserForm no encontrado en el DOM");
    }

    // Configurar botón de nuevo usuario
    const crearUsuarioBtn = document.getElementById("crearUsuarioBtn");
    if (crearUsuarioBtn) {
        crearUsuarioBtn.addEventListener("click", () => {
            console.log("[DEBUG] Clic en botón Crear Usuario");
            abrirModal("createUserModal");
        });
    } else {
        console.error("[ERROR] Elemento #crearUsuarioBtn no encontrado en el DOM");
    }

    // Configurar cierre de modales
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                console.log("[DEBUG] Clic en botón cerrar modal para:", modal.id);
                cerrarModal(modal.id);
            }
        });
    });

    // Clic fuera del modal
    window.addEventListener("click", (event) => {
        const modal = document.querySelector(".modal.show");
        if (modal && event.target === modal) {
            console.log("[DEBUG] Clic fuera del modal:", modal.id);
            cerrarModal(modal.id);
        }
    });
});

// Cargar usuarios
async function loadUsers() {
    const token = localStorage.getItem("token");
    console.log("[DEBUG] Iniciando carga de usuarios");
    try {
        console.log(`[DEBUG] Enviando solicitud a ${API_URL}/api/Usuarios`);
        const response = await fetch(`${API_URL}/api/Usuarios`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        console.log(`[DEBUG] Respuesta de /api/Usuarios: Status=${response.status}, StatusText=${response.statusText}`);
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error("[DEBUG] Cuerpo del error:", errorData);
            } catch (e) {
                errorData = { message: `Error HTTP ${response.status}: ${response.statusText || 'No encontrado'}` };
            }
            console.error("[ERROR] Error en respuesta de /api/Usuarios:", errorData);
            throw new Error(errorData.message || "Error al cargar usuarios");
        }

        const users = await response.json();
        console.log("[DEBUG] Respuesta completa de /api/Usuarios:", JSON.stringify(users, null, 2));
        const tbody = document.getElementById("usersTableBody");
        if (!tbody) {
            console.error("[ERROR] Elemento #usersTableBody no encontrado en el DOM");
            return;
        }
        tbody.innerHTML = "";
        console.log(`[DEBUG] Generando ${users.length} filas de usuarios`);

        users.forEach(user => {
            const rol = user.rol || user.Rol || user.role || "Sin rol definido";
            console.log(`[DEBUG] Procesando usuario: ID=${user.id}, Nombre=${user.nombre}, Rol=${rol}`);
            if (!user.rol && !user.Rol && !user.role) {
                console.warn(`[WARNING] El campo 'rol' no está definido para el usuario ${user.nombre}`);
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

        // Asignar eventos a botones dinámicos después de insertar las filas
        asignarEventosBotones();
    } catch (error) {
        console.error("[ERROR] Error al cargar usuarios:", error);
        mostrarNotificacion(error.message || "Error al cargar usuarios", "error");
    }
}

// Función para asignar eventos a botones dinámicos
function asignarEventosBotones() {
    const editButtons = document.querySelectorAll(".btn-editar");
    console.log(`[DEBUG] Botones .btn-editar encontrados: ${editButtons.length}`);
    if (editButtons.length === 0) {
        console.warn("[WARNING] No se encontraron botones .btn-editar. Verifica la generación de la tabla.");
    }
    editButtons.forEach(btn => {
        btn.removeEventListener("click", handleEditClick);
        btn.addEventListener("click", handleEditClick);
    });

    const deleteButtons = document.querySelectorAll(".btn-eliminar");
    console.log(`[DEBUG] Botones .btn-eliminar encontrados: ${deleteButtons.length}`);
    deleteButtons.forEach(btn => {
        btn.removeEventListener("click", handleDeleteClick);
        btn.addEventListener("click", handleDeleteClick);
    });
}

// Manejadores de eventos para evitar duplicados
function handleEditClick(event) {
    const id = event.currentTarget.dataset.id;
    if (!id || isNaN(id)) {
        console.error(`[ERROR] ID inválido para el botón editar: ${id}`);
        mostrarNotificacion("ID de usuario inválido", "error");
        return;
    }
    console.log(`[DEBUG] Clic en botón editar para usuario ID: ${id}`);
    abrirModalEditarUsuario(id);
}

function handleDeleteClick(event) {
    const id = event.currentTarget.dataset.id;
    if (!id || isNaN(id)) {
        console.error(`[ERROR] ID inválido para el botón eliminar: ${id}`);
        mostrarNotificacion("ID de usuario inválido", "error");
        return;
    }
    console.log(`[DEBUG] Clic en botón eliminar para usuario ID: ${id}`);
    eliminarUsuario(id);
}

// Función para abrir el modal de edición de usuario
async function abrirModalEditarUsuario(id) {
    const token = localStorage.getItem("token");
    console.log(`[DEBUG] Iniciando abrirModalEditarUsuario para usuario ID: ${id}`);
    
    // Verificar existencia de elementos del formulario
    const editUserId = document.getElementById("editUserId");
    const editUsername = document.getElementById("editUsername");
    const editPassword = document.getElementById("editPassword");
    const editRole = document.getElementById("editRole");
    if (!editUserId || !editUsername || !editPassword || !editRole) {
        console.error("[ERROR] Uno o más elementos del formulario de edición no encontrados");
        mostrarNotificacion("Error en la configuración del formulario de edición", "error");
        abrirModal("editUserModal");
        return;
    }

    try {
        // Lista de endpoints a probar
        const endpoints = [
            { url: `${API_URL}/api/Usuarios/details/${id}`, method: "GET" },
            { url: `${API_URL}/api/Usuarios/byId/${id}`, method: "GET" },
            { url: `${API_URL}/api/Usuarios/${id}`, method: "GET" },
            { url: `${API_URL}/api/Usuarios/get`, method: "POST", body: JSON.stringify({ id: parseInt(id) }) }
        ];

        let response, user;
        for (const endpoint of endpoints) {
            console.log(`[DEBUG] Probando ${endpoint.method} a ${endpoint.url}`);
            response = await fetch(endpoint.url, {
                method: endpoint.method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: endpoint.body || null
            });

            console.log(`[DEBUG] Respuesta de ${endpoint.url}: Status=${response.status}, StatusText=${response.statusText}, Headers:`, [...response.headers]);
            if (response.ok) {
                user = await response.json();
                console.log("[DEBUG] Datos del usuario cargado:", user);
                break;
            } else {
                let errorData;
                try {
                    const text = await response.text();
                    console.log("[DEBUG] Cuerpo de la respuesta de error:", text || "Vacío");
                    errorData = text ? JSON.parse(text) : { message: `Error HTTP ${response.status}: ${response.statusText || 'No encontrado'}` };
                } catch (e) {
                    errorData = { message: `Error HTTP ${response.status}: ${response.statusText || 'No encontrado'}` };
                }
                console.warn(`[WARNING] Falló ${endpoint.method} a ${endpoint.url}:`, errorData);
            }
        }

        if (!response.ok) {
            console.error("[ERROR] Ningún endpoint funcionó para cargar datos del usuario ID:", id);
            // Abrir el modal con datos vacíos
            editUserId.value = id;
            editUsername.value = "";
            editPassword.value = "";
            editRole.value = "User";
            abrirModal("editUserModal");
            throw new Error("No se pudo cargar los datos del usuario");
        }

        // Ajustar según el formato real de la respuesta
        editUserId.value = user.id || id;
        editUsername.value = user.nombre || user.nombreUsuario || "";
        editPassword.value = "";
        editRole.value = user.rol || user.Rol || user.role || "User";

        abrirModal("editUserModal");
    } catch (error) {
        console.error("[ERROR] Error en abrirModalEditarUsuario:", error);
        mostrarNotificacion(error.message || "Error al cargar usuario", "error");
    }
}

// Función para eliminar usuario
async function eliminarUsuario(id) {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;

    const token = localStorage.getItem("token");
    console.log(`[DEBUG] Iniciando eliminación de usuario ID: ${id}`);
    try {
        console.log(`[DEBUG] Enviando solicitud DELETE a ${API_URL}/api/Usuarios/${id}`);
        const response = await fetch(`${API_URL}/api/Usuarios/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        console.log(`[DEBUG] Respuesta DELETE: Status=${response.status}, StatusText=${response.statusText}`);
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
                console.error("[DEBUG] Cuerpo del error:", errorData);
            } catch (e) {
                errorData = { message: `Error HTTP ${response.status}: ${response.statusText || 'No encontrado'}` };
            }
            throw new Error(errorData.message || "Error al eliminar usuario");
        }

        mostrarNotificacion("Usuario eliminado exitosamente", "success");
        loadUsers();
    } catch (error) {
        console.error("[ERROR] Error al eliminar usuario:", error);
        mostrarNotificacion(error.message || "Error al eliminar usuario", "error");
    }
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = "info") {
    console.log(`[DEBUG] Mostrando notificación: ${mensaje} (tipo: ${tipo})`);
    const notificacion = document.createElement("div");
    notificacion.className = `notificacion ${tipo}`;
    notificacion.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.classList.add("show");
        console.log("[DEBUG] Clase .show agregada a notificación");
    }, 10);
    setTimeout(() => {
        notificacion.classList.remove("show");
        setTimeout(() => {
            notificacion.remove();
            console.log("[DEBUG] Notificación removida del DOM");
        }, 300);
    }, 3000);
}