// server.js

const express = require("express");
const path = require("path");

const app = express();
const port = Number(process.env.PORT) || 3000;

// Логирование входящих запросов (для отладки)
app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.path}`);
  next();
});

// Эндпоинт для Health Check – Railway будет обращаться сюда
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Роут для корневого пути – отдаём index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Раздаем статические файлы из папки public
app.use(express.static(path.join(__dirname, "public")));

app.listen(port, "0.0.0.0", () => {
  console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});
