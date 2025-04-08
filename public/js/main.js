// public/js/main.js
import { initMatches, gatherMatchesData } from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// Функция для загрузки сохранённых данных с сервера и обновления UI
async function loadMatchesFromServer() {
  try {
    const response = await fetch("/api/matchdata");
    const matches = await response.json();
    
    matches.forEach((match, index) => {
      const matchIndex = index + 1;
      
      const timeInput = document.getElementById(`timeInput${matchIndex}`);
      if (timeInput) {
        timeInput.value = match.UPCOM_TIME || match.LIVE_TIME || match.FINISHED_TIME || "";
      }
      
      const statusSelect = document.getElementById(`statusSelect${matchIndex}`);
      if (statusSelect) {
        if (match.FINISHED_MATCH_STATUS === "FINISHED") {
          statusSelect.value = "FINISHED";
        } else if (match.LIVE_MATCH_STATUS === "LIVE") {
          statusSelect.value = "LIVE";
        } else if (match.UPCOM_MATCH_STATUS === "UPCOM") {
          statusSelect.value = "UPCOM";
        }
      }
      
      const team1Select = document.getElementById(`team1Select${matchIndex}`);
      if (team1Select) {
        team1Select.value = match.UPCOM_TEAM1 || match.LIVE_TEAM1 || match.FINISHED_TEAM1 || team1Select.value;
      }
      const team2Select = document.getElementById(`team2Select${matchIndex}`);
      if (team2Select) {
        team2Select.value = match.UPCOM_TEAM2 || match.LIVE_TEAM2 || match.FINISHED_TEAM2 || team2Select.value;
      }
    });
  } catch (error) {
    console.error("Ошибка загрузки matchdata:", error);
  }
}

// Функция для получения JSON-данных и вывода их на страницу
async function updateJsonOutput() {
  try {
    const res = await fetch("/api/matchdata");
    const data = await res.json();
    document.getElementById("jsonOutput").textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    console.error("Ошибка получения JSON:", error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadMatchesFromServer();
  loadAllVRS();
  updateJsonOutput(); // выводим JSON сразу после загрузки
});

// Функция автосохранения с использованием дебаунсинга (500 мс)
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

      // Обновляем VRS данные после сохранения
      loadAllVRS();

      console.log("Автосохранение прошло успешно", {
        savedMatches,
        savedVeto,
        savedVRS
      });
      
      // Обновляем JSON-вывод после сохранения
      updateJsonOutput();
      
    } catch (err) {
      console.error("Ошибка автосохранения:", err);
    }
  }, 500);
}

// Привязываем автосохранение ко всем input и select элементам
document.querySelectorAll("input, select").forEach(element => {
  element.addEventListener("change", async () => {
    try {
      const matchesData = gatherMatchesData();
      await saveData("/api/matchdata", matchesData);
      // Другие сохранения (mapVeto, VRS) можно также вызывать здесь или по отдельным событиям
      
      // Клиент получит socket.io уведомление об обновлении и обновит UI
    } catch (err) {
      console.error("Ошибка автосохранения:", err);
    }
  });
});
