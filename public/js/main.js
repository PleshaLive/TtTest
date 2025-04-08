// public/js/main.js

import { 
  initMatches, 
  gatherMatchesData, 
  updateWinnerButtonLabels, 
  refreshWinnerHighlight,
  updateStatusColor,
  populateTeamSelects 
} from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// Функция загрузки списка команд (из data.json через API)
function loadTeams() {
  fetch("/api/teams")
    .then((res) => res.json())
    .then((data) => {
      // Предполагается, что API возвращает либо объект { teams: [...] }, либо просто массив.
      const teamsList = data.teams || data;
      populateTeamSelects(teamsList);
    })
    .catch((err) => {
      console.error("Ошибка загрузки списка команд:", err);
    });
}

// Функция для проверки, редактирует ли пользователь данные
function isUserEditing() {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toUpperCase();
  return (tag === "INPUT" || tag === "SELECT") && Boolean(active.closest(".match-column"));
}

// Функция загрузки данных матчей с сервера и обновления UI
async function loadMatchesFromServer() {
  try {
    const response = await fetch("/api/matchdata");
    const matches = await response.json();
    
    matches.forEach((match, index) => {
      const matchIndex = index + 1;
      
      // Обновляем поле времени, если элемент не в фокусе
      const timeInput = document.getElementById(`timeInput${matchIndex}`);
      if (timeInput && !timeInput.matches(":focus")) {
        timeInput.value = match.UPCOM_TIME || match.LIVE_TIME || match.FINISHED_TIME || "";
      }
      
      // Обновляем статус матча и применяем стиль, если элемент не в фокусе
      const statusSelect = document.getElementById(`statusSelect${matchIndex}`);
      if (statusSelect && !statusSelect.matches(":focus")) {
        if (match.FINISHED_MATCH_STATUS === "FINISHED") {
          statusSelect.value = "FINISHED";
        } else if (match.LIVE_MATCH_STATUS === "LIVE") {
          statusSelect.value = "LIVE";
        } else if (match.UPCOM_MATCH_STATUS === "UPCOM") {
          statusSelect.value = "UPCOM";
        }
        updateStatusColor(statusSelect);
      }
      
      // Обновляем селекты команд, если они не в фокусе
      const team1Select = document.getElementById(`team1Select${matchIndex}`);
      if (team1Select && !team1Select.matches(":focus")) {
        team1Select.value = match.UPCOM_TEAM1 || match.LIVE_TEAM1 || match.FINISHED_TEAM1 || team1Select.value;
      }
      const team2Select = document.getElementById(`team2Select${matchIndex}`);
      if (team2Select && !team2Select.matches(":focus")) {
        team2Select.value = match.UPCOM_TEAM2 || match.LIVE_TEAM2 || match.FINISHED_TEAM2 || team2Select.value;
      }
      
      // Обновляем визуальные элементы победителя
      updateWinnerButtonLabels(matchIndex);
      refreshWinnerHighlight(matchIndex);
    });
  } catch (error) {
    console.error("Ошибка загрузки matchdata:", error);
  }
}

// При загрузке страницы загружаем список команд и данные матчей и VRS
window.addEventListener("DOMContentLoaded", () => {
  loadTeams();
  loadMatchesFromServer();
  loadAllVRS();
});

// Функция автосохранения (debounce 500 мс)
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

// Socket.io: обновляем UI, если пользователь не редактирует
const socket = io();
socket.on("reload", async () => {
  console.log("Получено событие обновления");
  if (!isUserEditing()) {
    // Задержка 1500 мс для гарантии сохранения данных
    setTimeout(async () => {
      await loadMatchesFromServer();
    }, 1500);
  } else {
    console.log("Пользователь сейчас редактирует форму — обновление отложено");
    setTimeout(async () => {
      if (!isUserEditing()) {
        await loadMatchesFromServer();
      }
    }, 1500);
  }
});
