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

// Если файла базы нет, создаём его с единой структурой
let db = {};
if (!fs.existsSync(dbFilePath)) {
  db = {
    matches: [],       // матчи храним как массив
    mapVeto: {},
    vrs: {},
    customFields: {}
  };
  fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));
} else {
  const rawData = fs.readFileSync(dbFilePath, "utf8");
  db = JSON.parse(rawData);
}

// Функция сохранения базы на диск с логированием
function saveDB() {
  fs.writeFile(dbFilePath, JSON.stringify(db, null, 2), (err) => {
    if (err) {
      console.error("Ошибка при сохранении db.json:", err);
    } else {
      console.log("db.json успешно обновлен");
      // Для отладки: читаем и выводим содержимое файла
      const updatedData = fs.readFileSync(dbFilePath, "utf8");
      console.log("Содержимое db.json после сохранения:", updatedData);
    }
  });
}

// Создаем Express-приложение
const app = express();
const port = process.env.PORT || 3000;

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
  cookie: { secure: false } // при HTTPS установить true
}));

// Роут для страницы логина
app.get("/login", (req, res) => {
  if (req.session.authenticated) return res.redirect("/");
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  // Пример проверки логина/пароля
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

// === API для матчей ===
app.get("/api/matchdata", (req, res) => {
  // Отдаем массив матчей
  res.json(db.matches);
});

/*
  POST /api/matchdata:
  - Если пришёл массив, обновляем весь список матчей (либо производим частичное обновление)
  - Если пришёл один объект, ищем его по уникальному полю (например, id) и обновляем или добавляем новый матч
  - Пример обновления VRS для матчей со статусом FINISHED (настраивается по потребности)
*/
app.post("/api/matchdata", (req, res) => {
  let incomingMatches = req.body;
  if (!Array.isArray(incomingMatches)) {
    incomingMatches = [incomingMatches];
  }
  
  incomingMatches.forEach(newMatch => {
    // Если в объекте есть поле id, используем его для поиска; иначе можно использовать другой критерий
    const index = db.matches.findIndex(m => m.id && newMatch.id && m.id === newMatch.id);
    if (index !== -1) {
      // Обновляем существующий матч
      db.matches[index] = newMatch;
    } else {
      // Добавляем новый матч
      db.matches.push(newMatch);
    }
  });
  
  // Пример: если матч завершён, обновляем VRS (этот блок можно изменить по необходимости)
  db.matches.forEach((match, idx) => {
    if (match.FINISHED_MATCH_STATUS === "FINISHED") {
      const matchId = (match.id) ? match.id : idx + 1;
      if (!db.vrs[matchId]) return;
      const winner = match.TEAMWINNER;
      if (winner === match.FINISHED_TEAM1) {
        db.vrs[matchId].TEAM1.currentPoints += db.vrs[matchId].TEAM1.winPoints;
        db.vrs[matchId].TEAM2.currentPoints += db.vrs[matchId].TEAM2.losePoints;
      } else if (winner === match.FINISHED_TEAM2) {
        db.vrs[matchId].TEAM2.currentPoints += db.vrs[matchId].TEAM2.winPoints;
        db.vrs[matchId].TEAM1.currentPoints += db.vrs[matchId].TEAM1.losePoints;
      }
    }
  });
  
  saveDB();
  io.emit("jsonUpdate", db.matches);
  res.json(db.matches);
});

// === API для Map Veto ===
app.get("/api/mapveto", (req, res) => {
  res.json(db.mapVeto);
});
app.post("/api/mapveto", (req, res) => {
  db.mapVeto = req.body; // Полное обновление объекта mapVeto
  saveDB();
  io.emit("mapVetoUpdate", db.mapVeto);
  res.json(db.mapVeto);
});

// === API для VRS ===
app.get("/api/vrs/:id", (req, res) => {
  const matchId = req.params.id;
  if (!db.vrs[matchId]) return res.json([]);
  // Оборачиваем объект в массив для согласованного формата
  res.json([db.vrs[matchId]]);
});
app.post("/api/vrs", (req, res) => {
  const matchId = req.body.matchId;
  db.vrs[matchId] = req.body;
  saveDB();
  io.emit("vrsUpdate", db.vrs);
  res.json(db.vrs);
});

// === API для custom fields ===
app.get("/api/customfields", (req, res) => {
  res.json([db.customFields]);
});
app.post("/api/customfields", (req, res) => {
  db.customFields = req.body;
  saveDB();
  io.emit("customFieldsUpdate", db.customFields);
  res.json(db.customFields);
});

// === API для списка команд (из data.json) ===
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
const serverHttp = http.createServer(app);
const io = new SocketIOServer(serverHttp);

io.on("connection", (socket) => {
  console.log("Клиент подключён");
  socket.emit("jsonUpdate", db.matches);
  socket.emit("customFieldsUpdate", db.customFields);
});

serverHttp.listen(port, "0.0.0.0", () => {
  console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});
