// server.js – минимальный вариант для тестирования работы на Railway

const express = require("express");
const path = require("path");

const app = express();
// Используем переменную окружения PORT, либо 3000 (Railway обычно задаёт свой порт)
const port = Number(process.env.PORT) || 3000;

// Роут для Health Check — Railway сможет получить 200 OK
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

// Роут для корневого пути
app.get("/", (req, res) => {
  res.send("Hello World! — сервер работает");
});

// Раздаем статику из папки public (убедитесь, что папка есть в репозитории)
app.use(express.static(path.join(__dirname, "public")));

// Логирование входящих запросов (для отладки)
app.use((req, res, next) => {
  console.log("[REQ]", req.method, req.path);
  next();
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Сервер запущен на http://0.0.0.0:${port}`);
});
