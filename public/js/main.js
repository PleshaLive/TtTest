// public/js/main.js
import { initMatches, gatherMatchesData } from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// ========== Socket.io подписки ==========

// Обновление матчей (Matches 1–4)
// Сервер посылает событие "jsonUpdate", содержащее массив матчей
socket.on("jsonUpdate", (matches) => {
  console.log("Получено обновление JSON (Matches):", matches);
  updateMatchesUI(matches);
  const jsonOutput = document.getElementById("jsonOutput");
  if (jsonOutput) {
    jsonOutput.textContent = JSON.stringify(matches, null, 2);
  }
});

// Обновление Map Veto
socket.on("mapVetoUpdate", (updatedMapVeto) => {
  console.log("Получены обновления Map Veto:", updatedMapVeto);
  updateMapVetoUI(updatedMapVeto);
});

// Обновление VRS
socket.on("vrsUpdate", (vrsData) => {
  console.log("Получены обновления VRS:", vrsData);
  updateVRSUI(vrsData);
});

// Обновление верхнего блока (custom fields)
socket.on("customFieldsUpdate", (newFields) => {
  console.log("Получены обновления customFields:", newFields);
  updateCustomFieldsUI(newFields);
});

// ========== Функции обновления UI ==========

// Обновление Matches UI (включая поля времени, статус, команды и данные по картам)
function updateMatchesUI(matches) {
  matches.forEach((match, index) => {
    const matchIndex = index + 1;
    
    // Обновляем время матча
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
    }
    
    // Обновляем команды
    const team1Select = document.getElementById(`team1Select${matchIndex}`);
    if (team1Select && (match.UPCOM_TEAM1 || match.LIVE_TEAM1 || match.FINISHED_TEAM1)) {
      team1Select.value = match.UPCOM_TEAM1 || match.LIVE_TEAM1 || match.FINISHED_TEAM1;
    }
    const team2Select = document.getElementById(`team2Select${matchIndex}`);
    if (team2Select && (match.UPCOM_TEAM2 || match.LIVE_TEAM2 || match.FINISHED_TEAM2)) {
      team2Select.value = match.UPCOM_TEAM2 || match.LIVE_TEAM2 || match.FINISHED_TEAM2;
    }
    
    // Обновляем данные по картам (например, название карты и счёт)
    const matchColumn = document.querySelector(`.match-column[data-match="${matchIndex}"]`);
    if (matchColumn) {
      const mapRows = matchColumn.querySelectorAll(".map-row");
      mapRows.forEach((row, i) => {
        const mapKey = `MAP${i + 1}`;
        const scoreKey = `MAP${i + 1}_SCORE`;
        const mapSelect = row.querySelector(".map-name-select");
        const scoreInput = row.querySelector(".map-score-input");
        if (mapSelect && match[mapKey] !== undefined) {
          mapSelect.value = match[mapKey];
        }
        if (scoreInput && match[scoreKey] !== undefined) {
          scoreInput.value = match[scoreKey];
        }
      });
    }
  });
}

// Обновление Map Veto UI
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

// Обновление VRS UI
function updateVRSUI(vrsData) {
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

// Обновление UI для верхнего блока (custom fields)
function updateCustomFieldsUI(fields) {
  const upcoming = document.getElementById("upcomingMatchesInput");
  if (upcoming) {
    upcoming.value = fields.upcomingMatches || "";
  }
  const galaxy = document.getElementById("galaxyBattleInput");
  if (galaxy) {
    galaxy.value = fields.galaxyBattle || "";
  }
  const startDate = document.getElementById("tournamentStart");
  if (startDate && fields.tournamentStart) {
    startDate.value = fields.tournamentStart;
  }
  const endDate = document.getElementById("tournamentEnd");
  if (endDate && fields.tournamentEnd) {
    endDate.value = fields.tournamentEnd;
  }
  const dayDisplay = document.getElementById("tournamentDayDisplay");
  if (dayDisplay) {
    dayDisplay.textContent = fields.tournamentDay || "";
  }
  const group = document.getElementById("groupStageInput");
  if (group) {
    group.value = fields.groupStage || "";
  }
}

// ========== Загрузка данных ==========

async function loadMatchesFromServer() {
  try {
    const response = await fetch("/api/matchdata");
    const matches = await response.json();
    updateMatchesUI(matches);
  } catch (error) {
    console.error("Ошибка загрузки matchdata:", error);
  }
}

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

// Функция вычисления текущего дня турнира
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

// Привязка обработчиков изменения дат
document.getElementById("tournamentStart").addEventListener("change", updateTournamentDay);
document.getElementById("tournamentEnd").addEventListener("change", updateTournamentDay);

// ========== Функции сбора данных ==========

function gatherCustomFieldsData() {
  return {
    upcomingMatches: document.getElementById("upcomingMatchesInput").value,
    galaxyBattle: document.getElementById("galaxyBattleInput").value,
    tournamentStart: document.getElementById("tournamentStart").value,
    tournamentEnd: document.getElementById("tournamentEnd").value,
    tournamentDay: document.getElementById("tournamentDayDisplay").textContent,
    groupStage: document.getElementById("groupStageInput").value
  };
}

// Функции gatherMatchesData, gatherMapVetoData и gatherVRSData импортируются из соответствующих модулей

// ========== Функция Apply ==========

// Функция, которая по нажатию на кнопку Apply собирает все данные и отправляет их на сервер
async function applyChanges() {
  try {
    // Сохраняем данные матчей
    const matchesData = gatherMatchesData();
    await saveData("/api/matchdata", matchesData);

    // Сохраняем данные Map Veto
    const mapVetoData = gatherMapVetoData();
    await saveData("/api/mapveto", mapVetoData);

    // Сохраняем данные VRS
    const vrsData = gatherVRSData();
    await saveData("/api/vrs", vrsData);

    // Сохраняем данные верхнего блока (custom fields)
    const customData = gatherCustomFieldsData();
    await saveData("/api/customfields", customData);

    // После сохранения загружаем обновлённые данные
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

// ========== Инициализация при загрузке страницы ==========

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    loadMatchesFromServer();
    loadAllVRS();
  }, 500);
});
