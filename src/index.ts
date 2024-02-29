import { plainToClass } from "class-transformer";
import { validateOrReject } from "class-validator";
import dotenv from "dotenv";
import "es6-shim";
import express, { Express, Request, Response } from "express";
import { Pool } from "pg";
import "reflect-metadata";
import { Board } from "./dto/Board";
import { List } from "./dto/List";
import { Card } from "./dto/Card";
import { User } from "./dto/User";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: +process.env.DB_PORT!,
});


// Definir una instancia de la aplicación Express
const app: Express = express();
const port = process.env.PORT || 3000;
app.use(express.json());

app.get("/users", async (req: Request, res: Response) => {
  try {
    const query = 'SELECT id, name, email FROM "user"';
    const result = await pool.query(query); //Hace la consulta a la base de datos y se almacena en result.
    res.status(200).json(result.rows);
  } catch (errors) {
    return res.status(400).json(errors);
  }
});

app.post("/users", async (req: Request, res: Response) => {
  let userDto: User = plainToClass(User, req.body); // Decorador
  try {
    await validateOrReject(userDto); // Decorador

    const query = 'INSERT INTO "user"(name, email) VALUES($1, $2) RETURNING *'; //Guarda la peticion en text 
    const values = [userDto.name, userDto.email]; //Almacena los datos de name y email del JSON para luego ser enviado a la base de datos
    const result = await pool.query(query, values); // Implementa la accion almacenado en text con los datos almacenado en values
    res.status(201).json(result.rows[0]); //Todo funco correctamente :)
  } catch (errors) {
    return res.status(422).json(errors); //No funco como deberia :(
  }
}); //Funca 

// Crear tablero de usuario (DML - INSERT)
app.post('/boards/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  let newBoard: Board = plainToClass(Board, req.body); // Decorador

  const resp = await pool.connect();
  try {
    await validateOrReject(newBoard); // Decorador

    resp.query("BEGIN");
    const query = 'INSERT INTO "board" (name) VALUES ($1) RETURNING *'; // DML - INSERT
    const values = [newBoard.name]; // Extrae el nombre del formato JSON para insertarlo en la query
    const { rows } = await resp.query(query, values); // DML - Query Execution

    const BoardUserId = rows[0].id; //Extrae el id generado por el INSERT de board.
    const assignQuery = 'INSERT INTO "boarduser" (board_id, user_id, is_admin) VALUES ($1, $2, true)'; // DML - INSERT
    await resp.query(assignQuery, [BoardUserId, userId]); // DML - Query Execution

    resp.query("COMMIT");
    res.json({ board: rows[0] });
  } catch (error) {
    resp.query("ROLLBACK");
    res.status(500).json({ error: 'Ocurrió un error al crear el tablero' });
  }
}); //Funca

// Asignar un usuario a un tablero (DML - INSERT)
app.post('/boards/:boardId/users', async (req: Request, res: Response) => {
  const boardId = req.params.boardId; // Extrae el boardId del link
  const userId = req.body.userId; // Extrae el userId del formato JSON

  const resp = await pool.connect();
  try {
    resp.query("BEGIN");
    const query = 'INSERT INTO "boarduser" (board_id, user_id) VALUES ($1, $2)'; // DML - INSERT
    await resp.query(query, [boardId, userId]); // DML - Query Execution
    // await indica que la ejecución del código se pausará hasta que la consulta se complete y se obtenga una respuesta de la base de datos.

    resp.query("COMMIT");
    res.json({ message: 'Usuario asignado al tablero' });
  } catch (error) {
    resp.query("ROLLBACK");
    res.status(500).json({ error: 'Ocurrió un error al asignar el usuario a al tablero' });
  }
});//Funca


// Obtener las listas de un tablero específico (DQL - SELECT)
app.get('/boards/:boardId/lists', async (req: Request, res: Response) => {
  const boardId = req.params.boardId;

  try {
    const query = 'SELECT * FROM "list" WHERE board_id = $1'; // DQL - SELECT
    const { rows } = await pool.query(query, [boardId]); // DML - Query Execution
    res.json({ lists: rows });
  } catch (error) {
    res.status(500).json({ error: 'Ocurrió un error al obtener las listas' });
  }
}); //Funca

// Crear una lista en un tablero (DML - INSERT)
app.post('/boards/:boardId/lists', async (req: Request, res: Response) => {
  const boardId = req.params.boardId;
  let newList: List = plainToClass(List, req.body); // Decorador
  

  const resp = await pool.connect();
  try {
    await validateOrReject(newList); // Decorador

    resp.query("BEGIN");
    const query = 'INSERT INTO "list" (name, board_id) VALUES ($1, $2) RETURNING *'; // DML - INSERT
    const values = [newList.name, boardId];
    const { rows } = await resp.query(query, values); // DML - Query Execution
    resp.query("COMMIT");
    res.json({ list: rows[0] });
  } catch (error) {
    resp.query("ROLLBACK");
    res.status(500).json({ error: 'Ocurrió un error al crear la lista' });
  }
}); //Funca

// Crear una tarjeta en una lista (DML - INSERT)
app.post('/lists/:listId/users/:userId/cards', async (req: Request, res: Response) => {
  const listId = req.params.listId;
  const userId = req.params.userId;
  let newCard: Card = plainToClass(Card, req.body); // Decorador
    

  const resp = await pool.connect();
  try {
    await validateOrReject(newCard); // Decorador

    resp.query("BEGIN");
    const query = 'INSERT INTO "card" (title, description, due_date, list_id) VALUES ($1, $2, $3, $4) RETURNING *'; // DML - INSERT
    const values = [newCard.title, newCard.description, newCard.due_date, listId];
    const { rows } = await resp.query(query, values); // DML - Query Execution

    const cardId = rows[0].id; //Extrae el id generado por el INSERT de Card.
    const assignQuery = 'INSERT INTO "carduser" (card_id, user_id, is_owner) VALUES ($1, $2, true)'; // DML - INSERT
    await resp.query(assignQuery, [cardId, userId]); // DML - Query Execution

    resp.query("COMMIT");
    res.json({ card: rows[0] });
  } catch (error) {
    resp.query("ROLLBACK");
    res.status(500).json({ error: 'Ocurrió un error al crear la tarjeta' });
  }
}); //Funca

// Asignar un usuario a una tarjeta (DML - INSERT)
app.post('/cards/:cardId/users', async (req: Request, res: Response) => {
  const cardId = req.params.cardId;
  const userId = req.body.userId;

  const resp = await pool.connect();
  try {
    resp.query("BEGIN");
    const query = 'INSERT INTO "carduser" (card_id, user_id) VALUES ($1, $2)'; // DML - INSERT
    await resp.query(query, [cardId, userId]); // DML - Query Execution

    resp.query("COMMIT");
    res.json({ message: 'Usuario asignado a la tarjeta' });
  } catch (error) {
    resp.query("ROLLBACK");
    res.status(500).json({ error: 'Ocurrió un error al asignar el usuario a la tarjeta' });
  }
});

  // Obtener una tarjeta con el user que la creó.
  app.get("/cards/:listId", async (req: Request, res: Response) => {
    const list_Id = req.params.listId;
    try {
      const Consulta1 = 'SELECT id FROM "card" WHERE list_id = $1';
      const dato1 = [list_Id];
      const resultado1 = await pool.query(Consulta1, dato1);
      const cardId = resultado1.rows[0].id;
  
      const Consulta2 = `
        SELECT User.name 
        FROM carduser CardUser
        JOIN "user" User ON CardUser.user_id = User.id
        WHERE CardUser.card_id = $1 AND CardUser.is_owner = true
      `;
      const dato2 = [cardId];
      const resultado2 = await pool.query(Consulta2, dato2);
  
      const response = {
        cards: resultado1.rows,
        ownerName: resultado2.rows[0].name
      };
  
      res.status(200).json(response);
    } catch (error) {
      console.log(error);
      return res.status(400).json(error);
    }
  }); //Funca


// Iniciar el servidor
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
