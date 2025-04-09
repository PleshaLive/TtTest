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
        // Здесь подставляем выбранное значение из сохранённых данных
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

async function updateAggregatedVRS() {
  try {
    const res = await fetch("/api/vrs-all");
    if (!res.ok) return;
    const allVRS = await res.json();
    console.log("Агрегированные VRS:", allVRS);

    // Предположим, что у вас есть блок <div id="aggregatedVRS"></div>:
    const aggregatedBlock = document.getElementById("aggregatedVRS");
    if (aggregatedBlock) {
      aggregatedBlock.textContent = JSON.stringify(allVRS, null, 2);
    }
  } catch (error) {
    console.error("Ошибка загрузки агрегированных VRS:", error);
  }
}

function calculateTournamentDay() {
  const startDateValue = document.getElementById("tournamentStart").value;
  if (!startDateValue) {
    return "";
  }
  const startDate = new Date(startDateValue);
  const today = new Date();

  // Вычисляем разницу в днях (округляем вниз и прибавляем 1)
  const diffTime = today - startDate;
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Если разница отрицательная (т.е. турнир ещё не начался) – можно выводить пустую строку
  if (diffDays < 1) {
    return "";
  }
  return "DAY " + diffDays;
}

function updateTournamentDay() {
  const display = document.getElementById("tournamentDayDisplay");
  if (display) {
    display.textContent = calculateTournamentDay();
  }
}

// Обновлять значение дня при изменении даты старта (и можно добавить аналогично для даты окончания, если нужно)
document.getElementById("tournamentStart").addEventListener("change", updateTournamentDay);
// Если требуется – можно добавить слушатель и для "tournamentEnd"


function gatherCustomFieldsData() {
  return {
    upcomingMatches: document.getElementById("upcomingMatchesInput").value,
    galaxyBattle: document.getElementById("galaxyBattleInput").value,
    tournamentDay: document.getElementById("tournamentDayDisplay").textContent, // вычисленное значение
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

document.getElementById("upcomingMatchesInput").addEventListener("change", saveCustomFields);
document.getElementById("galaxyBattleInput").addEventListener("change", saveCustomFields);
document.getElementById("groupStageInput").addEventListener("change", saveCustomFields);
document.getElementById("tournamentStart").addEventListener("change", () => {
  updateTournamentDay();
  saveCustomFields();
});
document.getElementById("tournamentEnd").addEventListener("change", saveCustomFields);


// Функция для получения JSON-данных и вывода их на страницу
async function updateJsonOutput() {
  try {
    const res = await fetch("/api/matchdata");
    const data = await res.json();
    const jsonOutput = document.getElementById("jsonOutput");
    if (jsonOutput) {
      jsonOutput.textContent = JSON.stringify(data, null, 2);
    }
  } catch (error) {
    console.error("Ошибка получения JSON:", error);
  }
}

// При загрузке страницы даем время на инициализацию селектов со списком команд,
// затем загружаем сохранённые данные и обновляем интерфейс.
window.addEventListener("DOMContentLoaded", () => {
  // Задержка 500 мс для того, чтобы initMatches и populateTeamSelects успели заполнить селекты
  setTimeout(() => {
    loadMatchesFromServer();
    loadAllVRS();
    updateJsonOutput(); // выводим JSON сразу после загрузки
  }, 500);
});

// Функция автосохранения с использованием дебаунсинга (500 мс)
let autoSaveTimeout;
function autoSave() {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      const matchesData = gatherMatchesData();
      await saveData("/api/matchdata", matchesData);

      const mapVetoData = gatherMapVetoData();
      await saveData("/api/mapveto", mapVetoData);

      const vrsData = gatherVRSData();
      await saveData("/api/vrs", vrsData);

      // После сохранения обновляем VRS интерфейс для каждого матча
      loadAllVRS();

      // Обновляем агрегированный блок с данными (из /api/vrs-all)
      updateAggregatedVRS();

      console.log("Автосохранение прошло успешно");
      updateJsonOutput();
    } catch (err) {
      console.error("Ошибка автосохранения:", err);
    }
  }, 500);
}


// Привязываем автосохранение ко всем input и select элементам
document.querySelectorAll("input, select").forEach(element => {
  element.addEventListener("change", () => {
    autoSave(); // теперь при каждом изменении полей вызовется autoSave
  });
});