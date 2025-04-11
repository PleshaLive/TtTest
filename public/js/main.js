// public/js/main.js
import { initMatches, gatherMatchesData } from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";

// Инициализация модулей
initMatches();
initMapVeto();
initVRS();

// Подписываемся на событие обновления JSON (например, для матчей)
socket.on("jsonUpdate", data => {
  console.log("Получено обновление JSON:", data);
  const jsonOutput = document.getElementById("jsonOutput");
  if (jsonOutput) {
    jsonOutput.textContent = JSON.stringify(data, null, 2);
  }
});

// Подписываемся на событие обновления Map Veto
socket.on("mapVetoUpdate", (updatedMapVeto) => {
  console.log("Получены обновления Map Veto:", updatedMapVeto);
  updateMapVetoUI(updatedMapVeto);
});

// Функция обновления UI для Map Veto
function updateMapVetoUI(mapVetoData) {
  // Предполагается, что mapVetoData.veto – массив объектов с данными по строкам
  mapVetoData.veto.forEach((vetoItem, idx) => {
    // Ищем строку таблицы по data-index (нумерация начинается с 1)
    const row = document.querySelector(`#vetoTable tr[data-index="${idx + 1}"]`);
    if (row) {
      row.querySelector(".veto-action").value = vetoItem.action;
      row.querySelector(".veto-map").value = vetoItem.map;
      row.querySelector(".veto-team").value = vetoItem.team;
      row.querySelector(".veto-side").value = vetoItem.side;
    }
  });
}

// Функция для загрузки матчей с сервера (при загрузке страницы)
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
      // При необходимости обновляем другие поля (например, команды, логотипы и т.д.)
    });
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

// Вычисление и обновление дня турнира (как реализовано ранее)
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

// Функции для кастомных полей (сбор и сохранение)
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

// Обработчики изменения дат турнира для обновления отображаемого дня и кастомных полей
document.getElementById("tournamentStart").addEventListener("change", () => {
  updateTournamentDay();
});
document.getElementById("tournamentEnd").addEventListener("change", () => {
  updateTournamentDay();
});

// Функция, которая собирает все данные и отправляет их на сервер по нажатию кнопки Apply
async function applyChanges() {
  try {
    // Собираем данные по матчам, Map Veto, VRS, а также кастомные поля
    const matchesData = gatherMatchesData();
    await saveData("/api/matchdata", matchesData);

    const mapVetoData = gatherMapVetoData();
    await saveData("/api/mapveto", mapVetoData);

    const vrsData = gatherVRSData();
    await saveData("/api/vrs", vrsData);

    await saveCustomFields();

    // Обновляем данные после сохранения (если требуется)
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

// При загрузке страницы загружаем начальные данные
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    loadMatchesFromServer();
    loadAllVRS();
  }, 500);
});
