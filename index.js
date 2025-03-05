const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://puntos-eeoo.onrender.com';

const socket = io(apiUrl, {
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
});

// Estado de la aplicación
let isConnected = false;

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
                    <td>
                        <button onclick="borrarCliente('${dni}')" 
                                class="delete-btn" 
                                title="Borrar cliente">
                            ❌
                        </button>
                    </td>
                </tr>`
            ).join('');
    } catch (error) {
        console.error("Error:", error);
        if (document.getElementById('modal').style.display !== 'flex') {
            showModal("Error al cargar clientes", false);
        }
    }
}

async function sumarPuntos() {
    const dniInput = document.getElementById("dni-cliente");
    const montoInput = document.getElementById("monto-compra");
    const dni = dniInput.value.trim();
    const monto = parseInt(montoInput.value);

    if (!dni.match(/^\d{8}$/)) {
        showModal("DNI debe tener 8 dígitos", false);
        return;
    }

    if (isNaN(monto) || monto < 1) {
        showModal("Monto inválido", false);
        return;
    }

    // Calcular puntos como 1% del monto, redondeado hacia abajo
    const puntos = Math.floor(monto * 0.01);

    const resultado = await realizarPeticion('sumar-puntos', { dni, puntos });
    if (resultado.success) {
        dniInput.value = '';
        montoInput.value = '';
        dniInput.focus();
    }
}

async function registrarUsuario() {
    const inputs = ['nombre', 'dni', 'telefono'];
    const datos = inputs.reduce((acc, id) => {
        acc[id] = document.getElementById(id).value.trim();
        return acc;
    }, {});

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
        inputs.forEach(id => document.getElementById(id).value = '');
        showModal("Usuario registrado exitosamente", true);
        await cargarClientes();
    }
}

async function realizarPeticion(endpoint, datos) {
    try {
        const res = await fetch(`${apiUrl}/${endpoint}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Error en la operación');
        }
        
        showModal(data.message, true);
        return { success: true };
    } catch (error) {
        console.error(`Error en ${endpoint}:`, error);
        showModal(error.message || 'Error en la operación', false);
        return { success: false };
    }
}

async function borrarCliente(dni) {
    if (!confirm(`¿Estás seguro de que deseas eliminar al cliente con DNI ${dni}?`)) {
        return;
    }

    try {
        const res = await fetch(`${apiUrl}/borrar-cliente`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dni })
        });

        const data = await res.json();
        showModal(data.message || "Cliente eliminado exitosamente", true);
        await cargarClientes();
    } catch (error) {
        showModal("Error al eliminar cliente", false);
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