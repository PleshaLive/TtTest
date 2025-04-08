// public/js/main.js

import { initMatches, gatherMatchesData, updateMatchUI } from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// Функция загрузки данных с сервера и обновления UI
async function loadMatchesFromServer() {
  try {
    const response = await fetch("/api/matchdata");
    const matches = await response.json();
    // Обновляем поля на странице с полученными данными
    updateMatchUI(matches);
    // Если отдельное обновление VRS требуется – вызываем loadAllVRS()
    loadAllVRS();
  } catch (error) {
    console.error("Ошибка загрузки matchdata:", error);
  }
}

// Вызываем загрузку данных при загрузке страницы
window.addEventListener("DOMContentLoaded", () => {
  loadMatchesFromServer();
});

// Функция автосохранения с использованием дебаунсинга (задержка 500 мс)
let autoSaveTimeout;
function autoSave() {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      // Собираем данные по матчам из формы
      const matchesData = gatherMatchesData();
      const savedMatches = await saveData("/api/matchdata", matchesData);

      // Собираем данные Map Veto
      const mapVetoData = gatherMapVetoData();
      const savedVeto = await saveData("/api/mapveto", mapVetoData);

      // Собираем данные VRS
      const vrsData = gatherVRSData();
      const savedVRS = await saveData("/api/vrs", vrsData);

      console.log("Автосохранение прошло успешно", {
        savedMatches,
        savedVeto,
        savedVRS
      });
    } catch (err) {
      console.error("Ошибка автосохранения:", err);
    }
  }, 500);
}

// Привязываем автосохранение ко всем input и select элементам
document.querySelectorAll("input, select").forEach(element => {
  element.addEventListener("change", autoSave);
});

// Подключаем socket.io и обновляем данные без полной перезагрузки страницы
const socket = io();
socket.on("reload", async () => {
  console.log("Получено событие обновления, обновляю данные...");
  await loadMatchesFromServer();
});
