import { initMatches, gatherMatchesData, updateMatchUI } from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// Функция загрузки данных с сервера и обновления UI
async function loadDataFromServer() {
  try {
    const res = await fetch("/api/matchdata");
    const matches = await res.json();
    // updateMatchUI — функция, которая обновляет поля (например, время, статусы, селекты и т.д.)
    updateMatchUI(matches);
    // Загружаем VRS (если у вас отдельный механизм)
    loadAllVRS();
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
  }
}

// Обновляем данные при загрузке страницы
window.addEventListener("DOMContentLoaded", () => {
  loadDataFromServer();
});

// Функция автосохранения с дебаунсингом
let autoSaveTimeout;
function autoSave() {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      const matchesData = gatherMatchesData();
      const savedMatches = await saveData("/api/matchdata", matchesData);
      
      const mapVetoData = gatherMapVetoData();
      const savedVeto = await saveData("/api/mapveto", mapVetoData);
      
      const vrsData = gatherVRSData();
      const savedVRS = await saveData("/api/vrs", vrsData);
      
      console.log("Автосохранение прошло успешно", { savedMatches, savedVeto, savedVRS });
    } catch (err) {
      console.error("Ошибка автосохранения:", err);
    }
  }, 500);
}

// Привязываем автосохранение ко всем input и select элементам
document.querySelectorAll("input, select").forEach((element) => {
  element.addEventListener("change", autoSave);
});

// Подключаем socket.io и обновляем данные без перезагрузки
const socket = io();
socket.on("reload", async () => {
  console.log("Получено событие обновления, обновляю данные...");
  await loadDataFromServer();
});
