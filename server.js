// server.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");

// Путь к файлу базы данных
const dbFilePath = path.join(__dirname, "db.json");

// Если файла базы нет, создаём его с унифицированной структурой
let db = {};
if (!fs.existsSync(dbFilePath)) {
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
    if (err) {
      console.error("Ошибка при сохранении db.json:", err);
    } else {
      console.log("db.json успешно обновлен");
    }
  });
}

// Универсальная функция обновления данных для сущностей
function handleUpdate(entity, key, newData, res) {
  console.log(`[POST] /api/${entity} - обновление`, newData);
  if (key) {
    // Обновляем, если передан идентификатор, например matchId или id
    db[entity][key] = newData;
  } else {
    // Если ключ не передан, используем поле id внутри newData
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

// Логирование входящих запросов
app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.path}`);
  next();
});

// Health-check
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Middleware: парсеры форм и куков
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Настройка сессий для авторизации
app.use(session({
  secret: "322223",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // для HTTPS установить true
}));

// Роут для страницы логина
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

// Роут для корневого пути — если не авторизован, перенаправляем на /login
app.get("/", (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Middleware авторизации для остальных маршрутов
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api/") ||
    req.session.authenticated ||
    req.path === "/login" ||
    req.path === "/login.css" ||
    req.path === "/health"
  ) {
    return next();
  }
  res.redirect("/login");
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* ====================================
   Работа с данными: matches, mapVeto, vrs, customFields
==================================== */

// Пример обработки логотипов – оставляем без изменений
const defaultTeam1Logo = "C:\\projects\\vMix_score\\public\\logos\\default1.png";
const defaultTeam2Logo = "C:\\projects\\vMix_score\\public\\logos\\default2.png";

// Дополнительные in-memory данные (если потребуется)
let savedMatches = [];       // не используется, так как у нас данные теперь в db.matches
let savedMapVeto = {};       // аналогично db.mapVeto
let savedVRS = {};           // аналог db.vrs
let customFieldsData = {};   // аналог db.customFields

// Загружаем in-memory данные при запуске (если требуются для legacy-логики)
if (db.matches) savedMatches = Object.values(db.matches);
if (db.mapVeto) savedMapVeto = db.mapVeto;
if (db.vrs) savedVRS = db.vrs;
if (db.customFields) customFieldsData = db.customFields;

/* --- API эндпоинты --- */

// API для матчей
app.get("/api/matchdata", (req, res) => {
  res.json(Object.values(db.matches));
});
app.get("/api/matchdata/:matchIndex", (req, res) => {
  const matches = Object.values(db.matches);
  const index = parseInt(req.params.matchIndex, 10) - 1;
  if (isNaN(index) || index < 0 || index >= matches.length) {
    return res.status(404).json({ message: `Матч с индексом ${req.params.matchIndex} не найден.` });
  }
  res.json([matches[index]]);
});
app.post("/api/matchdata", (req, res) => {
  // Если получен массив матчей, сохраняем каждый по id
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
  // Используем matchId как ключ
  const matchId = req.body.matchId;
  handleUpdate("mapVeto", matchId, req.body, res);
});

// API для VRS
app.get("/api/vrs/:id", (req, res) => {
  const matchId = req.params.id;
  if (!db.vrs[matchId]) return res.json([]);
  res.json([db.vrs[matchId]]);
});
app.post("/api/vrs", (req, res) => {
  const matchId = req.body.matchId;
  handleUpdate("vrs", matchId, req.body, res);
});

// API для custom fields
app.get("/api/customfields", (req, res) => {
  res.json([db.customFields]);
});
app.post("/api/customfields", (req, res) => {
  // Если у custom fields есть привязка к конкретному матчу, можно использовать matchId, иначе просто сохраняем объект
  const key = req.body.matchId || "global";
  handleUpdate("customFields", key, req.body, res);
});

// API для списка команд из файла data.json
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
==================================== */
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
