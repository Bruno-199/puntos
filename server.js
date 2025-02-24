require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Error de conexión:", err);
        return;
    }
    console.log("Conexión establecida con MySQL");
    connection.release();
});

app.post("/login", (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASS) {
        return res.json({ message: "Login exitoso" });
    }
    res.status(403).json({ error: "Acceso denegado" });
});

app.get("/clientes", (req, res) => {
    db.query("SELECT nombre, dni, telefono, puntos FROM usuarios1", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post("/sumar-puntos", (req, res) => {
    const { dni } = req.body;
    if (!dni) return res.status(400).json({ error: "DNI del cliente es requerido" });

    db.query("UPDATE usuarios1 SET puntos = puntos + 10 WHERE dni = ?", [dni], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Cliente no encontrado" });
        
        // Emitir actualización a todos los clientes
        io.emit('actualizacion-puntos');
        res.json({ message: "Puntos sumados con éxito" });
    });
});

app.post("/registrar-usuario", (req, res) => {
    const { nombre, dni, telefono } = req.body;
    if (!nombre || !dni || !telefono) {
        return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    db.query("INSERT INTO usuarios1 (nombre, dni, telefono, puntos) VALUES (?, ?, ?, 0)", 
        [nombre, dni, telefono], 
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Emitir actualización a todos los clientes
            io.emit('actualizacion-puntos');
            res.json({ message: "Usuario registrado con éxito" });
        }
    );
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));