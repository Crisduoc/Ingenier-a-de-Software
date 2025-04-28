const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs"); // Importa el módulo 'fs' para trabajar con archivos

const app = express();
const port = 3000;

// Middleware para parsear el cuerpo de las peticiones POST
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let db; // Declara la variable db en un scope más amplio

// Función para inicializar la base de datos
function initializeDatabase(callback) {
    const dbPath = "mydb.sqlite";
    const dbExists = fs.existsSync(dbPath);

    // Si la base de datos existe, la borramos para asegurarnos de que se recree
    if (dbExists) {
        fs.unlinkSync(dbPath);
        console.log("Base de datos existente eliminada.");
    }

    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("Error al conectar a la base de datos:", err.message);
            return callback(err);
        }
        console.log("Conectado a la base de datos mydb.sqlite");

        db.serialize(() => {
            // 1. Verificar si la tabla 'reservas' existe y eliminarla si es el caso
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='reservas'", (err, row) => {
                if (err) {
                    console.error("Error al verificar la existencia de la tabla reservas:", err.message);
                    return callback(err);
                }

                if (row) {
                    console.log("La tabla 'reservas' existe. Procediendo a eliminarla.");
                    db.run("DROP TABLE IF EXISTS reservas", (err) => {
                        if (err) {
                            console.error("Error al eliminar la tabla reservas:", err.message);
                            return callback(err);
                        }
                        console.log("Tabla 'reservas' eliminada exitosamente.");
                        crearTablaReservas(); // Llama a la función para crear la tabla después de eliminarla
                    });
                } else {
                    console.log("La tabla 'reservas' no existe. Procediendo a crearla.");
                    crearTablaReservas(); // Llama a la función para crear la tabla si no existe
                }
            });

            // 2. Función para crear la tabla 'reservas'
            function crearTablaReservas() {
                db.run(
                    `
                        CREATE TABLE IF NOT EXISTS reservas (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        check_in_date TEXT NOT NULL,
                        check_out_date TEXT NOT NULL,
                        habitacion_id INTEGER NOT NULL,
                        FOREIGN KEY (habitacion_id) REFERENCES habitacion(id)
                        )
                    `,
                    (err) => {
                        if (err) {
                            console.error("Error al crear la tabla reservas:", err.message);
                            return callback(err);
                        }
                        console.log("Tabla 'reservas' creada exitosamente.");
                        crearTablaHabitacion(); // Llama a la función para crear la tabla 'habitacion'
                    }
                );
            }

            // 3. Función para crear la tabla 'habitacion'
            function crearTablaHabitacion() {
                db.run(
                    `
                        CREATE TABLE IF NOT EXISTS habitacion (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        room_number INTEGER NOT NULL,
                        room_type TEXT NOT NULL
                        )
                    `,
                    (err) => {
                        if (err) {
                            console.error("Error al crear la tabla habitacion:", err.message);
                            return callback(err);
                        }
                        console.log("Tabla 'habitacion' creada exitosamente.");
                        insertarHabitacionesIniciales(); // Llama a la función para insertar datos de ejemplo
                    }
                );
            }

            // 4. Función para insertar habitaciones iniciales
            function insertarHabitacionesIniciales() {
                const habitaciones = [];
                for (let piso = 1; piso <= 3; piso++) {
                    for (let numero = 1; numero <= 10; numero++) {
                        const roomNumber = piso * 10 + numero;
                        const roomType = ["Simple", "Doble", "Suite"][Math.floor(Math.random() * 3)];
                        habitaciones.push({ room_number: roomNumber, room_type: roomType });
                    }
                }

                const insertHabitacion = db.prepare(
                    "INSERT INTO habitacion (room_number, room_type) VALUES (?, ?)"
                );
                habitaciones.forEach((habitacion) => {
                    insertHabitacion.run(habitacion.room_number, habitacion.room_type, (err) => {
                        if (err) {
                            console.error("Error al insertar habitación:", err.message);
                        }
                    });
                });
                insertHabitacion.finalize();
                callback(null); // Indica que la inicialización fue exitosa
            }
        });
    });
}

// Llamar a la función de inicialización de la base de datos
initializeDatabase((err) => {
    if (err) {
        process.exit(1);
    } else {
        startServer();
    }
});

// Función para iniciar el servidor Express
function startServer() {
    // Servir archivos estáticos
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
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    }

    app.get("/reservas", (req, res) => {
        obtenerReservas(db, res);
    });

    // Endpoint para crear una nueva reserva
    function crearReserva(db, res, name, check_in_date, check_out_date, habitacion_id) {
        const sql = `
            INSERT INTO reservas (name, check_in_date, check_out_date, habitacion_id)
            VALUES (?, ?, ?, ?);
        `;
        db.run(sql, [name, check_in_date, check_out_date, habitacion_id], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            db.get("SELECT last_insert_rowid() as id", [], (err, row) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
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

    app.post("/reservas", (req, res) => {
        const { name, check_in_date, check_out_date, habitacion_id } = req.body;
        crearReserva(db, res, name, check_in_date, check_out_date, habitacion_id);
    });

    // Endpoint para obtener las habitaciones disponibles
    app.get("/habitaciones", (req, res) => {
        const sql = "SELECT id, room_number, room_type FROM habitacion";
        db.all(sql, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        });
    });

    // Iniciar el servidor
    app.listen(port, () => {
        console.log(`Servidor escuchando en el puerto ${port}`);
    });
}
