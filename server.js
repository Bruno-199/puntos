require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// Database configuration
const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // Cambiado de 'name' a 'database'
    port: process.env.DB_PORT
});

// Routes
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'login.html')));

app.post("/login", (req, res) => {
    const { password } = req.body;
    return password === process.env.ADMIN_PASS
        ? res.json({ message: "Login exitoso" })
        : res.status(403).json({ error: "Acceso denegado" });
});

app.get("/clientes", (_, res) => {
    db.query("SELECT nombre, dni, telefono, puntos FROM usuarios1", 
        (err, results) => err 
            ? res.status(500).json({ error: err.message })
            : res.json(results)
    );
});

app.post("/sumar-puntos", (req, res) => {
    const { dni } = req.body;
    if (!dni) return res.status(400).json({ error: "DNI requerido" });

    db.query("UPDATE usuarios1 SET puntos = puntos + 10 WHERE dni = ?", [dni], 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ error: "Cliente no encontrado" });
            io.emit('actualizacion-puntos');
            res.json({ message: "Puntos sumados con éxito" });
        }
    );
});

app.post("/registrar-usuario", (req, res) => {
    const { nombre, dni, telefono } = req.body;
    if (!nombre || !dni || !telefono) {
        return res.status(400).json({ error: "Campos incompletos" });
    }

    db.query("INSERT INTO usuarios1 (nombre, dni, telefono, puntos) VALUES (?, ?, ?, 0)",
        [nombre, dni, telefono],
        (err, _) => {
            if (err) return res.status(500).json({ error: err.message });
            io.emit('actualizacion-puntos');
            res.json({ message: "Usuario registrado con éxito" });
        }
    );
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));