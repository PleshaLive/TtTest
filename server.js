// server.js
const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

// Логирование входящих запросов
app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.path}`);
  next();
});

// Эндпоинт для Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Корневой роут: возвращаем простой текст
app.get("/", (req, res) => {
  res.send("Hello World! — приложение работает");
});

// Раздаем статику из папки public
app.use(express.static(path.join(__dirname, "public")));

app.listen(port, "0.0.0.0", () => {
  console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});
