document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const submitBtn = event.target.querySelector("button[type='submit']");
    const API_URL = window.location.hostname === "localhost" 
    ? "http://localhost:5000" 
    : "https://corralon-backend.onrender.com";


    
    // Mostrar estado de carga
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Autenticando...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/Auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                nombreUsuario: username, 
                contraseña: password 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Credenciales incorrectas");
        }

        const data = await response.json();
        localStorage.setItem("token", data.token);
        
        // Mostrar notificación de éxito
        mostrarNotificacion("Bienvenido al sistema", "success");
        
        // Redirigir después de un breve retraso
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1500);

    } catch (error) {
        console.error("Error en login:", error);
        mostrarNotificacion(error.message || "Error al iniciar sesión", "error");
        
        // Restaurar botón
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        submitBtn.disabled = false;
    }
});

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