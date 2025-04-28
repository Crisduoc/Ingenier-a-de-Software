function obtenerReservas(db, res) {
    const sql = `
      SELECT
        r.id,
        r.check_in_date,
        r.check_out_date,
        h.room_number,
        h.room_type,
        r.name
      FROM reservas r
      JOIN habitacion h ON r.habitacion_id = h.id;
    `;
  
    db.all(sql, [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    });
  }
  
  function crearReserva(db, res, name, check_in_date, check_out_date, habitacion_id) {
    const sql = `
      INSERT INTO reservas (name, check_in_date, check_out_date, habitacion_id)
      VALUES (?, ?, ?, ?);
    `;
    db.run(sql, [name, check_in_date, check_out_date, habitacion_id], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      db.get("SELECT last_insert_rowid() as id", [], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({
          id: row.id,
          name,
          check_in_date,
          check_out_date,
          habitacion_id,
        });
      });
    });
  }
  
  // Modificamos server.js para usar las nuevas funciones y esquema de base de datos
  const express = require("express");
  const sqlite3 = require("sqlite3").verbose();
  const bodyParser = require("body-parser");
  const path = require("path");
  
  const app = express();
  const port = 3000;
  
  // Middleware para parsear el cuerpo de las peticiones POST
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  
  // Conexión a la base de datos (SQLite)
  const db = new sqlite3.Database("mydb.sqlite", (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Conectado a la base de datos mydb.sqlite");
    // Modificamos la creación de la tabla reservas y agregamos la tabla habitacion
    db.run(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        check_in_date TEXT NOT NULL,
        check_out_date TEXT NOT NULL,
        habitacion_id INTEGER NOT NULL,
        FOREIGN KEY (habitacion_id) REFERENCES habitacion(id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS habitacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_number INTEGER NOT NULL,
        room_type TEXT NOT NULL
      )
    `);
  
    // Insertar habitaciones iniciales (30 habitaciones)
    const habitaciones = [];
    for (let piso = 1; piso <= 3; piso++) {
      for (let numero = 1; numero <= 10; numero++) {
        const roomNumber = piso * 10 + numero; // Genera números de habitación del 101 al 310
        const roomType = ["Simple", "Doble", "Suite"][Math.floor(Math.random() * 3)]; //Tipo aleatorio
        habitaciones.push({ room_number: roomNumber, room_type: roomType });
      }
    }
  
    const insertHabitacion = db.prepare(
      "INSERT INTO habitacion (room_number, room_type) VALUES (?, ?)"
    );
    habitaciones.forEach((habitacion) => {
      insertHabitacion.run(habitacion.room_number, habitacion.room_type);
    });
    insertHabitacion.finalize();
  });
  
  // Servir archivos estáticos (HTML, CSS, JS)
  app.use(express.static(path.join(__dirname, "vistas")));
  app.use(express.static(path.join(__dirname, "css")));
  app.use(express.static(path.join(__dirname, "js")));
  app.use(express.static(path.join(__dirname)));
  
  // Rutas para las vistas HTML
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "vistas", "login.html"));
  });
  
  app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "vistas", "login.html"));
  });
  
  app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "vistas", "admin.html"));
  });
  
  app.get("/reservas", (req, res) => {
    res.sendFile(path.join(__dirname, "vistas", "reservas.html"));
  });
  
  // Endpoint para obtener todas las reservas
  app.get("/reservas", (req, res) => {
    obtenerReservas(db, res);
  });
  
  // Endpoint para crear una nueva reserva
  app.post("/reservas", (req, res) => {
    const { name, check_in_date, check_out_date, habitacion_id } = req.body;
    crearReserva(db, res, name, check_in_date, check_out_date, habitacion_id);
  });
  
  // Endpoint para obtener las habitaciones disponibles
  app.get("/habitaciones", (req, res) => {
    const sql = "SELECT id, room_number, room_type FROM habitacion";
    db.all(sql, [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    });
  });
  
  // Iniciar el servidor
  app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
  });
  