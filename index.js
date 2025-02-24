const apiUrl = "https://puntos-eeoo.onrender.com";
const socket = io(apiUrl, {
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

// Estado de la aplicación
let isConnected = false;
let lastUpdate = null;

// Autenticación
if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
} else {
    document.getElementById("admin-panel").style.display = "block";
    cargarClientes();
}

// Eventos Socket.IO
socket.on('connect', () => {
    isConnected = true;
    updateConnectionStatus(true);
});

socket.on('disconnect', () => {
    isConnected = false;
    updateConnectionStatus(false);
});

socket.on('actualizacion-puntos', cargarClientes);

// Funciones de UI
function updateConnectionStatus(connected) {
    const status = document.getElementById('connection-status');
    status.textContent = connected ? '🟢 Conectado' : '🔴 Desconectado';
    status.style.backgroundColor = connected ? 'rgba(92,255,92,0.1)' : 'rgba(255,92,92,0.1)';
}

function updateLastUpdate() {
    const span = document.getElementById('last-update');
    lastUpdate = new Date();
    span.textContent = `Última actualización: ${lastUpdate.toLocaleTimeString()}`;
}

function showModal(message, isSuccess = true) {
    const modal = document.getElementById('modal');
    const modalEmoji = document.getElementById('modal-emoji');
    const modalMessage = document.getElementById('modal-message');
    
    modalEmoji.textContent = isSuccess ? '✅' : '❌';
    modalMessage.textContent = message;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Funciones principales
async function cargarClientes() {
    try {
        const res = await fetch(`${apiUrl}/clientes`);
        if (!res.ok) throw new Error('Error al cargar clientes');
        
        const clientes = await res.json();
        document.getElementById("clientes-table").innerHTML = clientes
            .map(({nombre, dni, telefono, puntos}) => 
                `<tr>
                    <td>${nombre}</td>
                    <td>${dni}</td>
                    <td>${telefono}</td>
                    <td>${puntos}</td>
                </tr>`
            ).join('');
        
        updateLastUpdate();
    } catch (error) {
        console.error("Error:", error);
        showModal("Error al cargar clientes", false);
    }
}

async function sumarPuntos() {
    const dniInput = document.getElementById("dni-cliente");
    const dni = dniInput.value.trim();

    if (!dni.match(/^\d{8}$/)) {
        showModal("DNI debe tener 8 dígitos", false);
        return;
    }

    const resultado = await realizarPeticion('sumar-puntos', { dni });
    if (resultado.success) {
        dniInput.value = '';
        dniInput.focus();
    }
}

async function registrarUsuario() {
    const inputs = ['nombre', 'dni', 'telefono'];
    const datos = inputs.reduce((acc, id) => {
        acc[id] = document.getElementById(id).value.trim();
        return acc;
    }, {});

    // Validaciones
    if (!datos.nombre.match(/^[A-Za-zÁáÉéÍíÓóÚúÑñ\s]{3,50}$/)) {
        showModal("Nombre inválido", false);
        return;
    }
    if (!datos.dni.match(/^\d{8}$/)) {
        showModal("DNI debe tener 8 dígitos", false);
        return;
    }
    if (!datos.telefono.match(/^\d{9}$/)) {
        showModal("Teléfono debe tener 9 dígitos", false);
        return;
    }

    const resultado = await realizarPeticion('registrar-usuario', datos);
    if (resultado.success) {
        inputs.forEach(id => {
            const input = document.getElementById(id);
            input.value = '';
        });
        document.getElementById('nombre').focus();
    }
}

async function realizarPeticion(endpoint, datos) {
    try {
        const res = await fetch(`${apiUrl}/${endpoint}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: JSON.stringify(datos)
        });

        if (!res.ok) throw new Error('Error en la petición');
        
        const data = await res.json();
        showModal(data.message || data.error, !!data.message);
        return { success: !!data.message };
    } catch (error) {
        console.error(`Error en ${endpoint}:`, error);
        showModal('Error en la operación', false);
        return { success: false };
    }
}

function cerrarSesion() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

// Event Listeners
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Prevenir múltiples envíos
let isSubmitting = false;
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', () => {
        if (isSubmitting) return false;
        isSubmitting = true;
        setTimeout(() => isSubmitting = false, 1000);
    });
});