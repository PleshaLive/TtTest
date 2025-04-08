// public/js/main.js
import { 
  initMatches, 
  gatherMatchesData, 
  updateMatchUI, 
  populateTeamSelects, 
  updateStatusColor, 
  updateWinnerButtonLabels, 
  refreshWinnerHighlight 
} from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// Функция для загрузки списка команд и заполнения селектов
function loadTeams() {
  fetch("/api/teams")
    .then((res) => res.json())
    .then((data) => {
      const teams = data.teams || data;
      populateTeamSelects(teams);
    })
    .catch((err) => {
      console.error("Ошибка загрузки списка команд:", err);
    });
}

// Функция для проверки, редактирует ли пользователь данные:
// Если в данный момент активный элемент – input или select внутри блока матчей, считаем, что пользователь занят.
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
    
    // Обновляем UI для каждого матча
    matches.forEach((match, index) => {
      const matchIndex = index + 1;
      
      // Обновляем поле времени, если оно не находится в фокусе
      const timeInput = document.getElementById(`timeInput${matchIndex}`);
      if (timeInput && !timeInput.matches(":focus")) {
        timeInput.value = match.UPCOM_TIME || match.LIVE_TIME || match.FINISHED_TIME || "";
      }
      
      // Обновляем статус матча и окрашиваем селект, если элемент не в фокусе
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
      
      // Обновляем селекты команд (если не в фокусе)
      const team1Select = document.getElementById(`team1Select${matchIndex}`);
      if (team1Select && !team1Select.matches(":focus")) {
        team1Select.value = match.UPCOM_TEAM1 || match.LIVE_TEAM1 || match.FINISHED_TEAM1 || team1Select.value;
      }
      const team2Select = document.getElementById(`team2Select${matchIndex}`);
      if (team2Select && !team2Select.matches(":focus")) {
        team2Select.value = match.UPCOM_TEAM2 || match.LIVE_TEAM2 || match.FINISHED_TEAM2 || team2Select.value;
      }
      
      // Вызываем функции обновления кнопок-победителя и подсветки, если они есть
      updateWinnerButtonLabels(matchIndex);
      refreshWinnerHighlight(matchIndex);
    });
  } catch (error) {
    console.error("Ошибка загрузки matchdata:", error);
  }
}

// При загрузке страницы сначала загружаем список команд, затем данные матчей и VRS
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
      console.log("Автосохранение прошло успешно", {
        savedMatches,
        savedVeto,
        savedVRS,
      });
    } catch (err) {
      console.error("Ошибка автосохранения:", err);
    }
  }, 500);
}

// Привязываем автосохранение ко всем изменениям
document.querySelectorAll("input, select").forEach((element) => {
  element.addEventListener("change", autoSave);
});

// Socket.io: При получении события "reload", если пользователь не редактирует,
// обновляем данные с сервера – иначе откладываем обновление.
const socket = io();
socket.on("reload", async () => {
  console.log("Получено событие обновления");
  if (!isUserEditing()) {
    // Задержка для того, чтобы сервер успел сохранить данные
    setTimeout(async () => {
      await loadMatchesFromServer();
    }, 1500);
  } else {
    console.log("Пользователь редактирует форму – обновление отложено");
    setTimeout(async () => {
      if (!isUserEditing()) {
        await loadMatchesFromServer();
      }
    }, 1500);
  }
});
