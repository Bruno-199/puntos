require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// 🔹 Conexión con MySQL usando Pool
const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "tu_base_de_datos",
    port: process.env.DB_PORT || 3306,
});

db.getConnection((err, connection) => {
    if (err) console.error("❌ Error de conexión:", err);
    else {
        console.log("✅ Conexión establecida con MySQL (Pool)");
        connection.release();
    }
});

// 🔹 Contraseña de admin en archivo .env
const ADMIN_PASS = process.env.ADMIN_PASS || "admin";

// 🔹 Login de Admin
app.post("/login", (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASS) {
        return res.json({ message: "Login exitoso" });
    }
    
    res.status(403).json({ error: "Acceso denegado" });
});

// 🔹 Obtener lista de clientes
app.get("/clientes", (req, res) => {
    db.query("SELECT nombre, dni, telefono, puntos FROM usuarios1", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 🔹 Sumar 10 puntos a un cliente
app.post("/sumar-puntos", (req, res) => {
    const { dni } = req.body;
    if (!dni) return res.status(400).json({ error: "DNI del cliente es requerido" });

    db.query("UPDATE usuarios1 SET puntos = puntos + 10 WHERE dni = ?", [dni], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Cliente no encontrado" });

        res.json({ message: "✅ Puntos sumados con éxito" });
    });
});

// 🔹 Registrar un nuevo usuario
app.post("/registrar-usuario", (req, res) => {
    const { nombre, dni, telefono } = req.body;

    if (!nombre || !dni || !telefono) {
        return res.status(400).json({ error: "Todos los campos son requeridos" });
    }

    db.query("INSERT INTO usuarios1 (nombre, dni, telefono, puntos) VALUES (?, ?, ?, 0)", [nombre, dni, telefono], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "✅ Usuario registrado con éxito" });
    });
});

// 🔹 Iniciar el servidor
app.listen(3000, () => console.log("🚀 Servidor corriendo en http://localhost:3000"));