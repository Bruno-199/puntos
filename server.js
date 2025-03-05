// 1. Primero las configuraciones básicas
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

// 2. Configuraciones de CORS y Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:5500", "https://puntos-eeoo.onrender.com"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Actualizar la configuración de CORS
const corsOptions = {
    origin: ["http://localhost:3000", "http://127.0.0.1:5500", "https://puntos-eeoo.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Accept"]
};

// 3. Middleware básico - IMPORTANTE: antes de las rutas
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Agregar un middleware para verificar el tipo de contenido
app.use((req, res, next) => {
    if (req.method === 'POST') {
        if (!req.is('application/json')) {
            return res.status(400).json({ error: 'El contenido debe ser JSON' });
        }
    }
    next();
});

// Database configuration
const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, // Cambiado de 'name' a 'database'
    port: process.env.DB_PORT
});

// 4. Rutas API

// Agregar después de las configuraciones y antes de las otras rutas API
app.post("/login", async (req, res) => {
    const { password } = req.body;
    
    if (password === process.env.ADMIN_PASS) {
        res.json({ message: "Login exitoso" });
    } else {
        res.status(401).json({ error: "Contraseña incorrecta" });
    }
});

app.post("/borrar-cliente", async (req, res) => {
    const { dni } = req.body;
    
    try {
        await db.promise().query("DELETE FROM usuarios1 WHERE dni = ?", [dni]);
        io.emit('actualizacion-puntos');
        res.json({ message: "Cliente eliminado con éxito" });
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar cliente" });
    }
});

app.get("/clientes", async (_, res) => {
    try {
        const [results] = await db.promise().query("SELECT nombre, dni, telefono, puntos FROM usuarios1");
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/sumar-puntos", async (req, res) => {
    const { dni, puntos } = req.body;
    if (!dni) return res.status(400).json({ error: "DNI requerido" });
    if (!puntos) return res.status(400).json({ error: "Puntos requeridos" });

    try {
        const [result] = await db.promise().query(
            "UPDATE usuarios1 SET puntos = puntos + ? WHERE dni = ?", 
            [puntos, dni]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }
        
        io.emit('actualizacion-puntos');
        res.json({ message: `${puntos} puntos sumados con éxito` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/registrar-usuario", async (req, res) => {
    const { nombre, dni, telefono } = req.body;
    if (!nombre || !dni || !telefono) {
        return res.status(400).json({ error: "Campos incompletos" });
    }

    try {
        await db.promise().query("INSERT INTO usuarios1 (nombre, dni, telefono, puntos) VALUES (?, ?, ?, 0)", [nombre, dni, telefono]);
        io.emit('actualizacion-puntos');
        res.json({ message: "Usuario registrado con éxito" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Archivos estáticos - IMPORTANTE: después de las rutas API
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.use(express.static(path.join(__dirname)));

// 6. Iniciar servidor
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'desarrollo'}`);
});