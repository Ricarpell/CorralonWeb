const API_URL = window.location.hostname === "localhost" 
    ? "http://localhost:5000" 
    : "https://corralon-backend.onrender.com";

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
            document.getElementById("createUserForm").reset();
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
            // Intentar con la URL principal
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

            // Intentar URLs alternativas si falla
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
            document.getElementById("editUserModal").style.display = "none";
            loadUsers();
        } catch (error) {
            console.error("Error en editUserForm:", error);
            mostrarNotificacion(error.message || "Error al actualizar usuario", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Guardar Cambios";
        }
    });

    // Configurar modal
    const modal = document.getElementById("editUserModal");
    if (!modal) {
        console.error("Elemento #editUserModal no encontrado en el DOM");
    }
    const closeBtn = modal?.querySelector(".close");
    if (closeBtn) {
        closeBtn.onclick = () => {
            console.log("Cerrando modal mediante botón de cierre");
            modal.style.display = "none";
        };
    }
    window.onclick = (event) => {
        if (event.target === modal) {
            console.log("Cerrando modal al hacer clic fuera");
            modal.style.display = "none";
        }
    };

    // Configurar modal de creación
    const createModal = document.getElementById("createUserModal");
    if (!createModal) {
        console.error("Elemento #createUserModal no encontrado en el DOM");
    }
    const createCloseBtn = createModal?.querySelector(".close");
    if (createCloseBtn) {
        createCloseBtn.onclick = () => {
            console.log("Cerrando modal de creación mediante botón de cierre");
            createModal.style.display = "none";
        };
    }
    window.onclick = (event) => {
        if (event.target === createModal) {
            console.log("Cerrando modal de creación al hacer clic fuera");
            createModal.style.display = "none";
        }
    };

    // Configurar botón de nuevo usuario
    document.getElementById("crearUsuarioBtn")?.addEventListener("click", () => {
        const createModal = document.getElementById("createUserModal");
        if (createModal) {
            createModal.style.display = "block";
            document.getElementById("createUserForm").reset();
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
                console.warn(`Advertencia: El campo 'rol' no está presente en el usuario ID=${user.id}`);
            }
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.nombre}</td>
                <td>${rol}</td>
                <td><button class="btn btn-primary btn-sm" onclick="openEditModal(${user.id}, '${user.nombre}', '${rol}')">Editar</button></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error al cargar usuarios:", error);
        mostrarNotificacion("Error al cargar usuarios", "error");
    }
}

// Abrir modal de edición
function openEditModal(id, username, role) {
    console.log(`Intentando abrir modal para usuario: ID=${id}, Nombre=${username}, Rol=${role}`);
    const modal = document.getElementById("editUserModal");
    if (!modal) {
        console.error("Elemento #editUserModal no encontrado en el DOM");
        return;
    }
    const editUserId = document.getElementById("editUserId");
    const editUsername = document.getElementById("editUsername");
    const editRole = document.getElementById("editRole");
    const editPassword = document.getElementById("editPassword");

    if (!editUserId || !editUsername || !editRole || !editPassword) {
        console.error("Uno o más elementos del formulario de edición no encontrados");
        return;
    }

    editUserId.value = id;
    editUsername.value = username;
    editRole.value = role === "Sin rol definido" ? "User" : role;
    editPassword.value = "";
    modal.style.display = "block";
    console.log("Modal establecido a display: block");
}

// Reutilizar función de notificación
function mostrarNotificacion(mensaje, tipo = "error") {
    const notificacion = document.createElement("div");
    notificacion.className = `login-notification ${tipo}`;
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.classList.add("show");
    }, 10);
    
    setTimeout(() => {
        notificacion.classList.remove("show");
        setTimeout(() => {
            document.body.removeChild(notificacion);
        }, 300);
    }, 3000);
}