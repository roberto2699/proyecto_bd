"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
require("es6-shim");
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
require("reflect-metadata");
dotenv_1.default.config();
const pool = new pg_1.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: +process.env.DB_PORT,
});
// Definir una instancia de la aplicación Express
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Definir una ruta para obtener las listas de un tablero específico
app.get('/boards/:boardId/lists', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const boardId = req.params.boardId;
    try {
        // Consulta SQL para obtener las listas del tablero con el boardId
        const query = `SELECT * FROM List WHERE board_id = $1`;
        const { rows } = yield pool.query(query, [boardId]);
        // Enviar la respuesta con las listas obtenidas
        res.json({ lists: rows });
    }
    catch (error) {
        console.error('Error al obtener las listas:', error);
        res.status(500).json({ error: 'Ocurrió un error al obtener las listas' });
    }
}));
// Definir una ruta para crear una lista en un tablero
app.post('/boards/:boardId/lists', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const boardId = req.params.boardId;
    const newList = req.body;
    try {
        // Consulta SQL para crear una nueva lista en el tablero con el boardId
        const query = `INSERT INTO List (name, board_id) VALUES ($1, $2) RETURNING *`;
        const values = [newList.name, boardId];
        const { rows } = yield pool.query(query, values);
        // Enviar la respuesta con la lista creada
        res.json({ list: rows[0] });
    }
    catch (error) {
        console.error('Error al crear la lista:', error);
        res.status(500).json({ error: 'Ocurrió un error al crear la lista' });
    }
}));
// Definir una ruta para crear una tarjeta en una lista
app.post('/lists/:listId/cards', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const listId = req.params.listId;
    const newCard = req.body;
    try {
        // Consulta SQL para crear una nueva tarjeta en la lista con el listId
        const query = `INSERT INTO Card (title, description, due_date, list_id) VALUES ($1, $2, $3, $4) RETURNING *`;
        const values = [newCard.title, newCard.description, newCard.due_date, listId];
        const { rows } = yield pool.query(query, values);
        // Asignar el usuario que creó la tarjeta
        const cardId = rows[0].id;
        const createdBy = newCard.createdBy;
        const assignQuery = `INSERT INTO CardUser (card_id, user_id, is_owner) VALUES ($1, $2, true)`;
        yield pool.query(assignQuery, [cardId, createdBy]);
        // Enviar la respuesta con la tarjeta creada
        res.json({ card: rows[0] });
    }
    catch (error) {
        console.error('Error al crear la tarjeta:', error);
        res.status(500).json({ error: 'Ocurrió un error al crear la tarjeta' });
    }
}));
// Definir una ruta para asignar un usuario a una tarjeta
app.post('/cards/:cardId/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cardId = req.params.cardId;
    const userId = req.body.userId;
    try {
        // Consulta SQL para asignar el usuario con el userId a la tarjeta con el cardId
        const query = `INSERT INTO CardUser (card_id, user_id, is_owner) VALUES ($1, $2, false)`;
        yield pool.query(query, [cardId, userId]);
        // Enviar la respuesta con la asignación exitosa
        res.json({ message: 'Usuario asignado a la tarjeta correctamente' });
    }
    catch (error) {
        console.error('Error al asignar el usuario a la tarjeta:', error);
        res.status(500).json({ error: 'Ocurrió un error al asignar el usuario a la tarjeta' });
    }
}));
// Definir unaruta para obtener una tarjeta con el usuario que la creó
app.get('/cards/:cardId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cardId = req.params.cardId;
    try {
        // Consulta SQL para obtener la tarjeta con el cardId y el usuario que la creó
        const query = `SELECT c.*, u.name as createdBy FROM Card c JOIN CardUser cu ON c.id = cu.card_id JOIN User u ON cu.user_id = u.id WHERE c.id = $1`;
        const { rows } = yield pool.query(query, [cardId]);
        // Enviar la respuesta con la tarjeta y el usuario
        if (rows.length > 0) {
            res.json({ card: rows[0] });
        }
        else {
            res.status(404).json({ error: 'No se encontró la tarjeta especificada' });
        }
    }
    catch (error) {
        console.error('Error al obtener la tarjeta:', error);
        res.status(500).json({ error: 'Ocurrió un error al obtener la tarjeta' });
    }
}));
// Iniciar el servidor
app.listen(3000, () => {
    console.log('Servidor iniciado en el puerto 3000');
});
