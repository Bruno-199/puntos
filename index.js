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

// Funciones para los modales
function showModal(message, isSuccess = true) {
    closeActionModal(); // Aseguramos que el modal de acción esté cerrado
    
    const modal = document.getElementById('messageModal');
    const modalEmoji = document.getElementById('modal-emoji');
    const modalMessage = document.getElementById('modal-message');
    
    if (!modal || !modalEmoji || !modalMessage) {
        console.error('Elementos del modal no encontrados');
        return;
    }
    
    modalEmoji.textContent = isSuccess ? '✅' : '❌';
    modalMessage.textContent = message;
    modal.style.display = 'flex';
    modal.style.opacity = '1';
}

function closeModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function showActionModal(action) {
    closeModal(); // Aseguramos que el modal de mensaje esté cerrado
    
    currentAction = action;
    const modal = document.getElementById('actionModal');
    const title = document.getElementById('modal-title');
    const formContainer = document.getElementById('modal-form-container');
    
    if (!modal || !title || !formContainer) {
        console.error('Elementos del modal de acción no encontrados');
        return;
    }
    
    title.textContent = modalTitles[action];
    formContainer.innerHTML = modalForms[action];
    modal.style.display = 'flex';
    modal.style.opacity = '1';
}

function closeActionModal() {
    const modal = document.getElementById('actionModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            const formContainer = document.getElementById('modal-form-container');
            if (formContainer) {
                formContainer.innerHTML = '';
            }
            currentAction = ''; // Limpiamos la acción actual
        }, 300);
    }
}

// Configuración de los modales de acción
const modalForms = {
    register: `
        <form class="modal-form" id="registerForm">
            <input type="text" id="nombre" placeholder="Nombre completo" required>
            <input type="text" id="dni" placeholder="DNI" pattern="[0-9]{8}" maxlength="8" required>
            <input type="tel" id="telefono" placeholder="Teléfono" pattern="[0-9]{9}" maxlength="9" required>
        </form>
    `,
    search: `
        <form class="modal-form" id="searchForm">
            <input type="text" id="search-dni" placeholder="DNI del cliente" pattern="[0-9]{8}" maxlength="8" required>
        </form>
    `,
    add: `
        <form class="modal-form" id="addForm">
            <input type="text" id="add-dni" placeholder="DNI del cliente" pattern="[0-9]{8}" maxlength="8" required>
            <input type="number" id="monto-compra" placeholder="Monto de compra" min="1" required>
        </form>
    `,
    subtract: `
        <form class="modal-form" id="subtractForm">
            <input type="text" 
                   id="subtract-dni" 
                   placeholder="DNI del cliente" 
                   pattern="[0-9]{8}" 
                   maxlength="8" 
                   required>
            <input type="number" 
                   id="puntos-restar" 
                   placeholder="Puntos a restar" 
                   min="1" 
                   required>
        </form>
    `
};

const modalTitles = {
    register: 'Registrar Nuevo Usuario',
    search: 'Buscar Puntos',
    add: 'Sumar Puntos',
    subtract: 'Restar Puntos'
};

let currentAction = '';

// Funciones de acción
async function registrarUsuario() {
    const nombre = document.getElementById('nombre')?.value.trim();
    const dni = document.getElementById('dni')?.value.trim();
    const telefono = document.getElementById('telefono')?.value.trim();

    if (!nombre || !dni || !telefono) {
        showModal("Por favor, complete todos los campos", false);
        return;
    }

    try {
        const response = await realizarPeticion('registrar-usuario', { nombre, dni, telefono });
        
        if (response.success) {
            showModal("¡Cliente registrado exitosamente! 😊", true);
            closeActionModal();
            await cargarClientes();
        }
    } catch (error) {
        showModal(error.message || "Error al registrar cliente. ¡El DNI ya existe!", false);
    }
}

async function sumarPuntos() {
    const dni = document.getElementById('add-dni')?.value.trim();
    const monto = parseInt(document.getElementById('monto-compra')?.value);

    if (!dni || !dni.match(/^\d{8}$/)) {
        throw new Error('DNI debe tener 8 dígitos');
    }

    if (!monto || monto < 1) {
        throw new Error('El monto debe ser mayor a 0');
    }

    const puntos = Math.floor(monto * 0.01);
    return await realizarPeticion('sumar-puntos', { dni, puntos });
}

async function restarPuntos() {
    const dni = document.getElementById('subtract-dni')?.value.trim();
    const puntos = parseInt(document.getElementById('puntos-restar')?.value);

    if (!dni || !dni.match(/^\d{8}$/)) {
        throw new Error('DNI debe tener 8 dígitos');
    }

    if (!puntos || puntos < 1) {
        throw new Error('La cantidad de puntos debe ser mayor a 0');
    }

    return await realizarPeticion('restar-puntos', { dni, puntos });
}

async function buscarPuntos() {
    const dni = document.getElementById('search-dni')?.value.trim();
    
    if (!dni || !dni.match(/^\d{8}$/)) {
        throw new Error('DNI debe tener 8 dígitos');
    }

    try {
        const resultado = await realizarPeticionGET(`buscar-puntos/${dni}`);
        return {
            success: true,
            message: `El cliente tiene ${resultado.puntos} puntos`
        };
    } catch (error) {
        throw new Error(error.message || 'Error al buscar puntos');
    }
}

async function handleModalAction() {
    try {
        let resultado;
        
        switch(currentAction) {
            case 'register':
                resultado = await registrarUsuario();
                break;
            case 'search':
                resultado = await buscarPuntos();
                break;
            case 'add':
                resultado = await sumarPuntos();
                break;
            case 'subtract':
                resultado = await restarPuntos();
                break;
            default:
                throw new Error('Acción no reconocida');
        }

        if (resultado?.success) {
            closeActionModal(); // Primero cerramos el modal de acción
            setTimeout(() => { // Esperamos un momento antes de mostrar el mensaje
                showModal(resultado.message, true);
            }, 300);
            
            if (currentAction !== 'search') {
                await cargarClientes();
            }
        }
    } catch (error) {
        showModal(error.message || "Error en la operación", false);
    }
}

// Funciones principales
async function cargarClientes() {
    try {
        const res = await fetch(`${apiUrl}/clientes`);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Error al cargar clientes');
        }
        
        document.getElementById("clientes-table").innerHTML = data
            .map(({nombre, dni, telefono, puntos}) => 
                `<tr>
                    <td>${nombre}</td>
                    <td>${dni}</td>
                    <td>${telefono}</td>
                    <td>${puntos}</td>
                    <td>
                        <button onclick="mostrarConfirmacion('${dni}')" 
                                class="delete-btn" 
                                title="Borrar cliente">
                            ❌
                        </button>
                    </td>
                </tr>`
            ).join('');
    } catch (error) {
        console.error("Error al cargar clientes:", error);
        showModal("Error al cargar clientes. Por favor, intente nuevamente.", false);
    }
}

async function realizarPeticion(endpoint, datos) {
    try {
        const res = await fetch(`${apiUrl}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(datos)
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Error en la operación');
        }
        
        return {
            success: true,
            message: data.message
        };
    } catch (error) {
        if (error.message.includes('<!DOCTYPE')) {
            throw new Error('Error de conexión con el servidor');
        }
        throw error;
    }
}

async function realizarPeticionGET(endpoint) {
    try {
        const res = await fetch(`${apiUrl}/${endpoint}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Error en la operación');
        }
        
        return data;
    } catch (error) {
        if (error.message.includes('<!DOCTYPE')) {
            throw new Error('Error de conexión con el servidor');
        }
        throw error;
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
        closeActionModal();
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

let clienteAEliminar = null;

function mostrarConfirmacion(dni) {
    clienteAEliminar = dni;
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
    }
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            clienteAEliminar = null;
        }, 300);
    }
}

async function confirmarEliminacion() {
    if (!clienteAEliminar) return;
    
    try {
        const response = await fetch(`${apiUrl}/borrar-cliente`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dni: clienteAEliminar })
        });

        const data = await response.json();
        
        if (response.ok) {
            showModal('Cliente eliminado exitosamente', true);
            await cargarClientes();
        } else {
            showModal(data.error || 'Error al eliminar cliente', false);
        }
    } catch (error) {
        showModal('Error al conectar con el servidor', false);
    } finally {
        closeConfirmModal();
        clienteAEliminar = null;
    }
}

// Modificar la función que crea la tabla para usar el nuevo modal
function crearFilaCliente(cliente) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${cliente.nombre}</td>
        <td>${cliente.dni}</td>
        <td>${cliente.telefono}</td>
        <td>${cliente.puntos}</td>
        <td>
            <button onclick="mostrarConfirmacion('${cliente.dni}')" class="delete-btn">
                Eliminar
            </button>
        </td>
    `;
    return tr;
}