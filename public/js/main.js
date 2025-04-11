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
socket.on("jsonUpdate", (matches) => {
  console.log("Получено обновление JSON (Matches):", matches);
  updateMatchesUI(matches);
  // Вывод для отладки
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

// ========== Функция обновления UI для Matches ==========

function updateMatchesUI(matches) {
  matches.forEach((match, index) => {
    const matchIndex = index + 1;
    const matchColumn = document.querySelector(`.match-column[data-match="${matchIndex}"]`);
    if (!matchColumn) return;
    
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
      // Опционально: можно обновить цвет селекта
      updateStatusColor(statusSelect);
    }
    
    // Обновляем команды – здесь решаем, какой набор использовать
    const team1Select = document.getElementById(`team1Select${matchIndex}`);
    const team2Select = document.getElementById(`team2Select${matchIndex}`);
    if (team1Select) {
      // При статусе FINISHED используем FINISHED_TEAM1, иначе, если LIVE – LIVE_TEAM1, иначе UPCOM_TEAM1
      if (match.FINISHED_MATCH_STATUS === "FINISHED" && match.FINISHED_TEAM1) {
        team1Select.value = match.FINISHED_TEAM1;
      } else if (match.LIVE_MATCH_STATUS === "LIVE" && match.LIVE_TEAM1) {
        team1Select.value = match.LIVE_TEAM1;
      } else if (match.UPCOM_MATCH_STATUS === "UPCOM" && match.UPCOM_TEAM1) {
        team1Select.value = match.UPCOM_TEAM1;
      }
    }
    if (team2Select) {
      if (match.FINISHED_MATCH_STATUS === "FINISHED" && match.FINISHED_TEAM2) {
        team2Select.value = match.FINISHED_TEAM2;
      } else if (match.LIVE_MATCH_STATUS === "LIVE" && match.LIVE_TEAM2) {
        team2Select.value = match.LIVE_TEAM2;
      } else if (match.UPCOM_MATCH_STATUS === "UPCOM" && match.UPCOM_TEAM2) {
        team2Select.value = match.UPCOM_TEAM2;
      }
    }
    
    // Обновляем Winner – устанавливаем атрибут data-winner на matchColumn
    // Если в JSON хранится именно "TEAM1" или "TEAM2", устанавливаем напрямую:
    if (match.TEAMWINNER) {
      // Можно проверить: если winner равен "TEAM1" или "TEAM2" – установить как есть,
      // иначе сравнить с выбранными командами
      if (match.TEAMWINNER === "TEAM1" || match.TEAMWINNER === "TEAM2") {
        matchColumn.setAttribute("data-winner", match.TEAMWINNER);
      } else {
        // Дополнительно: сравнить с актуальным значением select
        if (team1Select && team1Select.value === match.TEAMWINNER) {
          matchColumn.setAttribute("data-winner", "TEAM1");
        } else if (team2Select && team2Select.value === match.TEAMWINNER) {
          matchColumn.setAttribute("data-winner", "TEAM2");
        } else {
          matchColumn.setAttribute("data-winner", "");
        }
      }
      refreshWinnerHighlight(matchIndex);
    } else {
      matchColumn.setAttribute("data-winner", "");
      refreshWinnerHighlight(matchIndex);
    }
    
    // Обновляем данные по картам и счёту
    // Выбираем префикс в зависимости от статуса
    let prefix = "";
    if (match.FINISHED_MATCH_STATUS === "FINISHED") {
      prefix = "FINISHED_";
    } else if (match.LIVE_MATCH_STATUS === "LIVE") {
      prefix = "LIVE_";
    } else if (match.UPCOM_MATCH_STATUS === "UPCOM") {
      prefix = "UPCOM_";
    }
    const mapRows = matchColumn.querySelectorAll(".map-row");
    mapRows.forEach((row, i) => {
      const mapKey = prefix + `MAP${i + 1}`;
      const scoreKey = prefix + `MAP${i + 1}_SCORE`;
      // Для отладки
      console.log(`Матч ${matchIndex} ${mapKey}:`, match[mapKey], "  ", `${scoreKey}:`, match[scoreKey]);
      
      const mapSelect = row.querySelector(".map-name-select");
      const scoreInput = row.querySelector(".map-score-input");
      if (mapSelect && match[mapKey] !== undefined) {
        mapSelect.value = match[mapKey];
      }
      if (scoreInput && match[scoreKey] !== undefined) {
        scoreInput.value = match[scoreKey];
      }
    });
  });
}

// ========== Функции обновления UI для других блоков ==========

function updateMapVetoUI(mapVetoData) {
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

function updateCustomFieldsUI(fields) {
  const upcoming = document.getElementById("upcomingMatchesInput");
  if (upcoming) upcoming.value = fields.upcomingMatches || "";
  const galaxy = document.getElementById("galaxyBattleInput");
  if (galaxy) galaxy.value = fields.galaxyBattle || "";
  const startDate = document.getElementById("tournamentStart");
  if (startDate && fields.tournamentStart) startDate.value = fields.tournamentStart;
  const endDate = document.getElementById("tournamentEnd");
  if (endDate && fields.tournamentEnd) endDate.value = fields.tournamentEnd;
  const dayDisplay = document.getElementById("tournamentDayDisplay");
  if (dayDisplay) dayDisplay.textContent = fields.tournamentDay || "";
  const groupStage = document.getElementById("groupStageInput");
  if (groupStage) groupStage.value = fields.groupStage || "";
}

// ========== Загрузка данных с сервера ==========

async function loadMatchesFromServer() {
  try {
    const response = await fetch("/api/matchdata");
    const matches = await response.json();
    updateMatchesUI(matches);
  } catch (error) {
    console.error("Ошибка загрузки matchdata:", error);
  }
}

async function loadCustomFieldsFromServer() {
  try {
    const response = await fetch("/api/customfields");
    const [data] = await response.json(); // Ожидаем массив, берем первый элемент
    updateCustomFieldsUI(data);
  } catch (err) {
    console.error("Ошибка загрузки custom fields:", err);
  }
}

async function updateAggregatedVRS() {
  try {
    const res = await fetch("/api/vrs-all");
    if (!res.ok) return;
    const allVRS = await res.json();
    console.log("Агрегированные VRS:", allVRS);
    const aggregatedBlock = document.getElementById("aggregatedVRS");
    if (aggregatedBlock) aggregatedBlock.textContent = JSON.stringify(allVRS, null, 2);
  } catch (error) {
    console.error("Ошибка загрузки агрегированных VRS:", error);
  }
}

// Функция вычисления текущего дня турнира
function calculateTournamentDay() {
  const startDateValue = document.getElementById("tournamentStart").value;
  if (!startDateValue) return "";
  const startDate = new Date(startDateValue);
  const today = new Date();
  const diffTime = today - startDate;
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays < 1) return "";
  return "DAY " + diffDays;
}

function updateTournamentDay() {
  const display = document.getElementById("tournamentDayDisplay");
  if (display) display.textContent = calculateTournamentDay();
}

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

// Функция applyChanges – собирает данные всех блоков и отправляет их на сервер
async function applyChanges() {
  try {
    const matchesData = gatherMatchesData();
    await saveData("/api/matchdata", matchesData);

    const mapVetoData = gatherMapVetoData();
    await saveData("/api/mapveto", mapVetoData);

    const vrsData = gatherVRSData();
    await saveData("/api/vrs", vrsData);

    const customData = gatherCustomFieldsData();
    await saveData("/api/customfields", customData);

    // После сохранения обновляем данные с сервера
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
    loadCustomFieldsFromServer();
  }, 500);
});
