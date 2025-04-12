// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");

// Загрузка базы данных (db.json)
const dbFilePath = path.join(__dirname, "db.json");
let db = {};
if (!fs.existsSync(dbFilePath)) {
  // Если файл не существует, создаём его с унифицированной структурой
  db = {
    matches: {},
    mapVeto: {},
    vrs: {},
    customFields: {}
  };
  fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));
} else {
  const rawData = fs.readFileSync(dbFilePath, "utf8");
  db = JSON.parse(rawData);
}

// Функция сохранения базы на диск
function saveDB() {
  fs.writeFile(dbFilePath, JSON.stringify(db, null, 2), (err) => {
    if (err) console.error("Ошибка при сохранении db.json:", err);
    else console.log("db.json успешно обновлен");
  });
}

// Универсальная функция обновления данных
function handleUpdate(entity, key, newData, res) {
  console.log(`[POST] /api/${entity} - обновление`, newData);
  if (key) {
    db[entity][key] = newData;
  } else {
    // Если не передан ключ, используем id из newData
    const id = newData.id;
    db[entity][id] = newData;
  }
  saveDB();
  io.emit(`${entity}Updated`, newData);
  res.json({ success: true });
}

// Создаем приложение Express
const app = express();
const port = 3000;

app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.path}`);
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  secret: "322223",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.get("/login", (req, res) => {
  if (req.session.authenticated) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "StarGalaxy" && password === "FuckTheWorld1996") {
    req.session.authenticated = true;
    return res.redirect("/");
  }
  res.redirect("/login?error=1");
});

app.get("/", (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((req, res, next) => {
  if (
    req.path.startsWith("/api/") ||
    req.session.authenticated ||
    req.path === "/login" ||
    req.path === "/login.css" ||
    req.path === "/health"
  ) return next();
  res.redirect("/login");
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ====================================
   API эндпоинты для унифицированного сохранения
==================================== */

// API для матчей
app.get("/api/matchdata", (req, res) => {
  res.json(Object.values(db.matches));
});
app.post("/api/matchdata", (req, res) => {
  // Если данные приходят как массив, сохраняем каждый элемент по его id
  if (Array.isArray(req.body)) {
    req.body.forEach(item => {
      db.matches[item.id] = item;
    });
  } else {
    db.matches[req.body.id] = req.body;
  }
  saveDB();
  io.emit("jsonUpdate", Object.values(db.matches));
  res.json(Object.values(db.matches));
});

// API для Map Veto
app.get("/api/mapveto", (req, res) => {
  res.json(db.mapVeto);
});
app.post("/api/mapveto", (req, res) => {
  handleUpdate("mapVeto", req.body.matchId, req.body, res);
});

// API для VRS
app.get("/api/vrs/:id", (req, res) => {
  const matchId = req.params.id;
  res.json(db.vrs[matchId] ? [db.vrs[matchId]] : []);
});
app.post("/api/vrs", (req, res) => {
  handleUpdate("vrs", req.body.matchId, req.body, res);
});

// API для Custom Fields
app.get("/api/customfields", (req, res) => {
  res.json([db.customFields]);
});
app.post("/api/customfields", (req, res) => {
  handleUpdate("customFields", req.body.matchId, req.body, res);
});

// API для списка команд (без изменений)
const teamsDataFile = path.join(__dirname, "data.json");
app.get("/api/teams", (req, res) => {
  fs.readFile(teamsDataFile, "utf8", (err, data) => {
    if (err) {
      console.error("Ошибка чтения data.json:", err);
      return res.status(500).json({ error: "Не удалось прочитать файл команд." });
    }
    try {
      const teamsData = JSON.parse(data);
      res.json(teamsData);
    } catch (e) {
      console.error("Ошибка парсинга JSON:", e);
      res.status(500).json({ error: "Ошибка парсинга JSON." });
    }
  });
});

/* ====================================
   Socket.io и запуск сервера
===================================== */
const server = http.createServer(app);
const io = new SocketIOServer(server);

io.on("connection", (socket) => {
  console.log("Клиент подключён");
  socket.emit("jsonUpdate", Object.values(db.matches));
  socket.emit("customFieldsUpdate", db.customFields);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});
