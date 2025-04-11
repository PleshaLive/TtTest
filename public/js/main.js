// public/js/main.js
import { initMatches, gatherMatchesData } from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// Подписываемся на socket.io события для обновлений

// Обновление матчей (Matches 1–4)
// Сервер посылает событие "jsonUpdate", содержащее массив матчей
socket.on("jsonUpdate", (matches) => {
  console.log("Получено обновление JSON (Matches):", matches);
  updateMatchesUI(matches);
  // Можно также обновить область для отладки (например, JSON-вывод)
  const jsonOutput = document.getElementById("jsonOutput");
  if (jsonOutput) {
    jsonOutput.textContent = JSON.stringify(matches, null, 2);
  }
});

// Обновление Map Veto – оставляем как было
socket.on("mapVetoUpdate", (updatedMapVeto) => {
  console.log("Получены обновления Map Veto:", updatedMapVeto);
  updateMapVetoUI(updatedMapVeto);
});

// Обновление VRS
socket.on("vrsUpdate", (vrsData) => {
  console.log("Получены обновления VRS:", vrsData);
  updateVRSUI(vrsData);
});

// Функция обновления UI для Matches
function updateMatchesUI(matches) {
  matches.forEach((match, index) => {
    const matchIndex = index + 1;
    // Обновляем поле времени матча
    const timeInput = document.getElementById(`timeInput${matchIndex}`);
    if (timeInput) {
      timeInput.value = match.UPCOM_TIME || match.LIVE_TIME || match.FINISHED_TIME || "";
    }
    // Обновляем селект статуса матча
    const statusSelect = document.getElementById(`statusSelect${matchIndex}`);
    if (statusSelect) {
      if (match.FINISHED_MATCH_STATUS === "FINISHED") {
        statusSelect.value = "FINISHED";
      } else if (match.LIVE_MATCH_STATUS === "LIVE") {
        statusSelect.value = "LIVE";
      } else if (match.UPCOM_MATCH_STATUS === "UPCOM") {
        statusSelect.value = "UPCOM";
      }
      // Если у вас есть функция обновления цвета статуса, вызовите её здесь:
      // updateStatusColor(statusSelect);
    }
    // Обновляем селекты для команд (если они заполнены сохранёнными значениями)
    const team1Select = document.getElementById(`team1Select${matchIndex}`);
    if (team1Select && (match.UPCOM_TEAM1 || match.LIVE_TEAM1 || match.FINISHED_TEAM1)) {
      team1Select.value = match.UPCOM_TEAM1 || match.LIVE_TEAM1 || match.FINISHED_TEAM1;
    }
    const team2Select = document.getElementById(`team2Select${matchIndex}`);
    if (team2Select && (match.UPCOM_TEAM2 || match.LIVE_TEAM2 || match.FINISHED_TEAM2)) {
      team2Select.value = match.UPCOM_TEAM2 || match.LIVE_TEAM2 || match.FINISHED_TEAM2;
    }
    // Дополнительное обновление можно расширить по необходимости
  });
}

// Функция обновления UI для Map Veto (как ранее)
function updateMapVetoUI(mapVetoData) {
  // Предполагается, что mapVetoData.veto – массив объектов с данными для каждой строки veto
  mapVetoData.veto.forEach((vetoItem, idx) => {
    const row = document.querySelector(`#vetoTable tr[data-index="${idx + 1}"]`);
    if (row) {
      row.querySelector(".veto-action").value = vetoItem.action;
      row.querySelector(".veto-map").value = vetoItem.map;
      row.querySelector(".veto-team").value = vetoItem.team;
      row.querySelector(".veto-side").value = vetoItem.side;
    }
  });
}

// Функция обновления UI для VRS
function updateVRSUI(vrsData) {
  // Для каждого матча (индексы 1–4) обновляем соответствующие поля
  for (let i = 1; i <= 4; i++) {
    if (vrsData[i]) {
      const team1Win = document.getElementById(`team1WinPoints${i}`);
      if (team1Win) team1Win.value = vrsData[i].TEAM1.winPoints;
      const team1Lose = document.getElementById(`team1LosePoints${i}`);
      if (team1Lose) team1Lose.value = vrsData[i].TEAM1.losePoints;
      const team1Rank = document.getElementById(`team1Rank${i}`);
      if (team1Rank) team1Rank.value = vrsData[i].TEAM1.rank;
      const team1Current = document.getElementById(`team1CurrentPoints${i}`);
      if (team1Current) team1Current.value = vrsData[i].TEAM1.currentPoints;

      const team2Win = document.getElementById(`team2WinPoints${i}`);
      if (team2Win) team2Win.value = vrsData[i].TEAM2.winPoints;
      const team2Lose = document.getElementById(`team2LosePoints${i}`);
      if (team2Lose) team2Lose.value = vrsData[i].TEAM2.losePoints;
      const team2Rank = document.getElementById(`team2Rank${i}`);
      if (team2Rank) team2Rank.value = vrsData[i].TEAM2.rank;
      const team2Current = document.getElementById(`team2CurrentPoints${i}`);
      if (team2Current) team2Current.value = vrsData[i].TEAM2.currentPoints;
    }
  }
}

// Функция загрузки матчей с сервера при загрузке страницы
async function loadMatchesFromServer() {
  try {
    const response = await fetch("/api/matchdata");
    const matches = await response.json();
    updateMatchesUI(matches);
  } catch (error) {
    console.error("Ошибка загрузки matchdata:", error);
  }
}

// Функция обновления агрегированного блока VRS (если используется)
async function updateAggregatedVRS() {
  try {
    const res = await fetch("/api/vrs-all");
    if (!res.ok) return;
    const allVRS = await res.json();
    console.log("Агрегированные VRS:", allVRS);
    const aggregatedBlock = document.getElementById("aggregatedVRS");
    if (aggregatedBlock) {
      aggregatedBlock.textContent = JSON.stringify(allVRS, null, 2);
    }
  } catch (error) {
    console.error("Ошибка загрузки агрегированных VRS:", error);
  }
}

// Вычисление и обновление дня турнира (как ранее)
function calculateTournamentDay() {
  const startDateValue = document.getElementById("tournamentStart").value;
  if (!startDateValue) { return ""; }
  const startDate = new Date(startDateValue);
  const today = new Date();
  const diffTime = today - startDate;
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays < 1) { return ""; }
  return "DAY " + diffDays;
}

function updateTournamentDay() {
  const display = document.getElementById("tournamentDayDisplay");
  if (display) {
    display.textContent = calculateTournamentDay();
  }
}

// Привязка обработчиков изменения дат (при необходимости)
document.getElementById("tournamentStart").addEventListener("change", updateTournamentDay);
document.getElementById("tournamentEnd").addEventListener("change", updateTournamentDay);

// Кастомные поля – сбор и сохранение
function gatherCustomFieldsData() {
  return {
    upcomingMatches: document.getElementById("upcomingMatchesInput").value,
    galaxyBattle: document.getElementById("galaxyBattleInput").value,
    tournamentDay: document.getElementById("tournamentDayDisplay").textContent,
    groupStage: document.getElementById("groupStageInput").value
  };
}

async function saveCustomFields() {
  const customData = gatherCustomFieldsData();
  try {
    const response = await saveData("/api/customfields", customData);
    console.log("Custom fields saved:", response);
  } catch (error) {
    console.error("Ошибка сохранения custom fields:", error);
  }
}

// Функция, которая по нажатию на кнопку Apply собирает все данные и отправляет их на сервер
async function applyChanges() {
  try {
    const matchesData = gatherMatchesData();
    await saveData("/api/matchdata", matchesData);

    const mapVetoData = gatherMapVetoData();
    await saveData("/api/mapveto", mapVetoData);

    const vrsData = gatherVRSData();
    await saveData("/api/vrs", vrsData);

    await saveCustomFields();

    // После сохранения обновляем данные (загрузка обновлений с сервера)
    loadMatchesFromServer();
    loadAllVRS();
    updateAggregatedVRS();

    console.log("Изменения успешно применены");
  } catch (error) {
    console.error("Ошибка при применении изменений:", error);
  }
}

// Привязываем обработчик на кнопку Apply (кнопка должна иметь id="applyButton" в HTML)
document.getElementById("applyButton").addEventListener("click", applyChanges);

// При загрузке страницы загружаем начальные данные для матчей и VRS
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    loadMatchesFromServer();
    loadAllVRS();
  }, 500);
});
