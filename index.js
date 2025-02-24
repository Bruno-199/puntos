const apiUrl = "https://puntos-eeoo.onrender.com";
const socket = io(apiUrl);

// Autenticación
!localStorage.getItem("token") 
    ? window.location.href = "login.html"
    : (document.getElementById("admin-panel").style.display = "block", cargarClientes());

// Eventos Socket.IO
socket.on('actualizacion-puntos', cargarClientes);

// Funciones del modal
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
    } catch (error) {
        console.error("Error al cargar clientes:", error);
        showModal("Error al cargar clientes", false);
    }
}

async function sumarPuntos() {
    const dniInput = document.getElementById("dni-cliente");
    if (!dniInput.value) {
        showModal("Ingrese el DNI del cliente", false);
        return;
    }
    
    const resultado = await realizarPeticion('sumar-puntos', { dni: dniInput.value });
    if (resultado.success) {
        dniInput.value = ''; // Limpia el input
    }
}

async function registrarUsuario() {
    const inputs = ['nombre', 'dni', 'telefono'];
    const datos = inputs.reduce((acc, id) => {
        acc[id] = document.getElementById(id).value;
        return acc;
    }, {});

    if (Object.values(datos).some(v => !v)) {
        showModal("Todos los campos son obligatorios", false);
        return;
    }

    const resultado = await realizarPeticion('registrar-usuario', datos);
    if (resultado.success) {
        // Limpia todos los inputs del formulario
        inputs.forEach(id => document.getElementById(id).value = '');
    }
}

async function realizarPeticion(endpoint, datos) {
    try {
        const res = await fetch(`${apiUrl}/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });
        const data = await res.json();
        showModal(data.message || data.error, !!data.message);
        return { success: !!data.message };
    } catch (error) {
        console.error(`Error en ${endpoint}:`, error);
        showModal('Error en la operación', false);
        return { success: false };
    }
}

const cerrarSesion = () => {
    localStorage.removeItem("token");
    window.location.href = "login.html";
};