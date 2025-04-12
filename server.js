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
    matches: [],       // NOTE: массив, т.к. в db.json "matches" уже в виде массива
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
      // Сразу читаем файл и выводим его содержимое
      const updatedData = fs.readFileSync(dbFilePath, "utf8");
      console.log("Содержимое db.json после сохранения:", updatedData);
    }
  });
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
  // NOTE: Пример проверки логина/пароля
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

// API для матчей
app.get("/api/matchdata", (req, res) => {
  // Просто возвращаем массив db.matches
  res.json(db.matches);
});

/*
  Логика POST /api/matchdata:
   1. Если пришёл массив, полностью перезаписываем db.matches
   2. Если пришёл один объект, пытаемся найти его в массиве по некому ключу (например, id)
      - если нашли, обновляем
      - если нет, пушим
   3. Если матч имеет статус FINISHED, обновляем VRS (как в вашем примере)
   4. Сохраняем в файл
   5. Отправляем событие io.emit('jsonUpdate', db.matches)
   6. Возвращаем обновлённый массив
*/
app.post("/api/matchdata", (req, res) => {
  let incomingMatches = req.body;

  // Если это не массив, делаем массив из одного элемента
  if (!Array.isArray(incomingMatches)) {
    incomingMatches = [incomingMatches];
  }

  // Обновляем db.matches
  // NOTE: Вариант 1 (перезапись всего массива):
  // db.matches = incomingMatches;

  // NOTE: Вариант 2 (частичное обновление):
  //  – Если нужно именно «частично» обновлять, ниже пример:
  incomingMatches.forEach(newMatch => {
    // Ищем в db.matches матч с таким же FINISHED_TIME / или любым полем, по которому можно сравнить
    // Можно использовать поле 'TEAMWINNER' или какой-то 'id' (в идеале – дополнительное поле newMatch.id)
    // Если в вашем объекте нету поля id, можно искать по комбинации полей
    const index = db.matches.findIndex(m => m.FINISHED_TIME === newMatch.FINISHED_TIME);
    if (index !== -1) {
      // обновляем существующий
      db.matches[index] = newMatch;
    } else {
      // добавляем новый
      db.matches.push(newMatch);
    }
  });

  // ============== Логика обновления VRS при статусе FINISHED ==============
  // Если матч завершён, обновляем VRS (пример)
  db.matches.forEach((match, idx) => {
    // Пример: если FINISHED_MATCH_STATUS === "FINISHED", в VRS что-то делаем
    if (match.FINISHED_MATCH_STATUS === "FINISHED") {
      // matchId – любой способ понять, какой это матч (например, idx+1)
      const matchId = idx + 1; 
      // Достаём из db.vrs для matchId, если нет – пропускаем
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
  
  // Сохраняем в файл
  saveDB();
  // Оповещаем всех клиентов
  io.emit("jsonUpdate", db.matches);

  // Возвращаем обновлённый массив
  res.json(db.matches);
});

// API для Map Veto
app.get("/api/mapveto", (req, res) => {
  res.json(db.mapVeto);
});
app.post("/api/mapveto", (req, res) => {
  /*
    Предположим, mapVeto хранится в db.mapVeto:
    {
      matchIndex: ...,
      teams: {...},
      veto: [...],
      ...
    }
   */
  db.mapVeto = req.body;
  saveDB();
  io.emit("mapVetoUpdate", db.mapVeto);
  res.json(db.mapVeto);
});

// API для VRS
app.get("/api/vrs/:id", (req, res) => {
  const matchId = req.params.id;
  if (!db.vrs[matchId]) return res.json([]);
  res.json([db.vrs[matchId]]);
});
app.post("/api/vrs", (req, res) => {
  // req.body предполагается вида:
  // {
  //   matchId: "1",
  //   TEAM1: { winPoints, losePoints, rank, currentPoints },
  //   TEAM2: { ... }
  // }
  const matchId = req.body.matchId;
  db.vrs[matchId] = req.body;  // Сохраняем
  saveDB();
  io.emit("vrsUpdate", db.vrs);
  res.json(db.vrs);
});

// API для custom fields
app.get("/api/customfields", (req, res) => {
  // Предположим, db.customFields – объект
  res.json([db.customFields]);
});
app.post("/api/customfields", (req, res) => {
  // Можно хранить как один общий объект
  db.customFields = req.body;
  saveDB();
  io.emit("customFieldsUpdate", db.customFields);
  res.json(db.customFields);
});

// API для списка команд (из data.json)
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
  // Отправляем текущие данные матчей сразу при подключении
  socket.emit("jsonUpdate", db.matches);
  // Отправляем custom fields, чтобы верхний блок отобразил актуальные значения
  socket.emit("customFieldsUpdate", db.customFields);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});
