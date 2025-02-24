const apiUrl = "https://puntos-eeoo.onrender.com";
const socket = io(apiUrl);

if (!localStorage.getItem("token")) {
    window.location.href = "login.html";
} else {
    document.getElementById("admin-panel").style.display = "block";
    cargarClientes();
}

// Escuchar eventos de socket.io
socket.on('actualizacion-puntos', () => {
    cargarClientes(); // Recargar la lista cuando hay cambios
});

async function cargarClientes() {
    try {
        const res = await fetch(`${apiUrl}/clientes`);
        const clientes = await res.json();
        let tableHTML = "";
        clientes.forEach(cliente => {
            tableHTML += `<tr>
                <td>${cliente.nombre}</td>
                <td>${cliente.dni}</td>
                <td>${cliente.telefono}</td>
                <td>${cliente.puntos}</td>
            </tr>`;
        });
        document.getElementById("clientes-table").innerHTML = tableHTML;
    } catch (error) {
        console.error("Error al cargar clientes:", error);
    }
}
async function sumarPuntos() {
    const dni = document.getElementById("dni-cliente").value;
    if (!dni) {
        alert("Ingrese el DNI del cliente.");
        return;
    }
    try {
        const res = await fetch(`${apiUrl}/sumar-puntos`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ dni })
        });
        const data = await res.json();
        alert(data.message || data.error);
        cargarClientes();
    } catch (error) {
        console.error("Error al sumar puntos:", error);
    }
}
async function registrarUsuario() {
    const nombre = document.getElementById("nombre").value;
    const dni = document.getElementById("dni").value;
    const telefono = document.getElementById("telefono").value;
    if (!nombre || !dni || !telefono) {
        alert("Todos los campos son obligatorios.");
        return;
    }
    try {
        const res = await fetch(`${apiUrl}/registrar-usuario`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nombre, dni, telefono })
        });
        const data = await res.json();
        alert(data.message || data.error);
        cargarClientes();
    } catch (error) {
        console.error("Error al registrar usuario:", error);
    }
}
function cerrarSesion() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}