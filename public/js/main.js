// public/js/main.js
import { initMatches, gatherMatchesData } from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// Флаг для определения, редактирует ли пользователь данные
let isEditing = false;

// Привязываем обработчики focus и blur ко всем input и select для контроля редактирования
document.querySelectorAll("input, select").forEach(el => {
  el.addEventListener("focus", () => {
    isEditing = true;
    console.log("Редактирование началось");
  });
  el.addEventListener("blur", () => {
    // Немного задерживаем сброс флага, чтобы завершается обработка события change
    setTimeout(() => {
      isEditing = false;
      console.log("Редактирование закончено — обновляю данные");
      loadMatchesFromServer(); // Обновляем данные с сервера после окончания редактирования
    }, 200);
  });
});

// Функция для загрузки сохранённых данных с сервера и обновления UI
async function loadMatchesFromServer() {
  try {
    const response = await fetch("/api/matchdata");
    const matches = await response.json();
    
    // Обновляем поля для каждого матча (предполагается, что matchdata — массив объектов)
    matches.forEach((match, index) => {
      const matchIndex = index + 1;
      
      // Обновляем поле времени
      const timeInput = document.getElementById(`timeInput${matchIndex}`);
      if (timeInput) {
        timeInput.value = match.UPCOM_TIME || match.LIVE_TIME || match.FINISHED_TIME || "";
      }
      
      // Обновляем статус матча
      const statusSelect = document.getElementById(`statusSelect${matchIndex}`);
      if (statusSelect) {
        if (match.FINISHED_MATCH_STATUS === "FINISHED") {
          statusSelect.value = "FINISHED";
        } else if (match.LIVE_MATCH_STATUS === "LIVE") {
          statusSelect.value = "LIVE";
        } else if (match.UPCOM_MATCH_STATUS === "UPCOM") {
          statusSelect.value = "UPCOM";
        }
        // Если у вас есть функция для обновления цвета статуса, можно вызвать её здесь:
        // updateStatusColor(statusSelect);
      }
      
      // Обновляем селекты команд
      const team1Select = document.getElementById(`team1Select${matchIndex}`);
      if (team1Select) {
        team1Select.value = match.UPCOM_TEAM1 || match.LIVE_TEAM1 || match.FINISHED_TEAM1 || team1Select.value;
      }
      const team2Select = document.getElementById(`team2Select${matchIndex}`);
      if (team2Select) {
        team2Select.value = match.UPCOM_TEAM2 || match.LIVE_TEAM2 || match.FINISHED_TEAM2 || team2Select.value;
      }
      
      // Если ранее использовались функции обновления кнопок победителя и подсветки,
      // вызовите их, например:
      // updateWinnerButtonLabels(matchIndex);
      // refreshWinnerHighlight(matchIndex);
    });
  } catch (error) {
    console.error("Ошибка загрузки matchdata:", error);
  }
}

// Вызываем загрузку данных при загрузке страницы
window.addEventListener("DOMContentLoaded", () => {
  loadMatchesFromServer();
  loadAllVRS(); // Обновление данных VRS
});

// Функция автосохранения с дебаунсингом (500 мс)
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

      // Обновляем данные VRS после сохранения
      loadAllVRS();

      console.log("Автосохранение прошло успешно", { savedMatches, savedVeto, savedVRS });
    } catch (err) {
      console.error("Ошибка автосохранения:", err);
    }
  }, 500);
}

// Привязываем автосохранение ко всем input и select элементам
document.querySelectorAll("input, select").forEach(element => {
  element.addEventListener("change", autoSave);
});

// Подключаем socket.io и обновляем данные без перезагрузки страницы,
// если пользователь не редактирует форму.
const socket = io();
socket.on("reload", async () => {
  console.log("Получено событие обновления");
  if (!isEditing) {
    // Добавляем задержку, чтобы изменения успели сохраниться на сервере (например, 1500 мс)
    setTimeout(async () => {
      await loadMatchesFromServer();
    }, 1500);
  } else {
    console.log("Пользователь редактирует форму — обновление отложено");
  }
});
