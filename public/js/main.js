// public/js/main.js
import { initMatches, gatherMatchesData } from "./matches.js";
import { initMapVeto, gatherMapVetoData } from "./mapVeto.js";
import { initVRS, loadAllVRS, gatherVRSData } from "./vrs.js";
import { saveData } from "./api.js";
import { initVRS, loadAllVRS, loadVRSState } from "./vrs.js";

// После initVRS() можно вызвать loadVRSState() для восстановления предыдущего состояния VRS:
initVRS();
loadVRSState();
// Затем попытаться загрузить актуальные данные с сервера:
loadAllVRS();

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
      // Если необходимо, можно также сохранять данные для mapVeto и VRS тут,
      // но автоSave() уже это делает с дебаунсом.
    } catch (err) {
      console.error("Ошибка автосохранения:", err);
    }
  });
});
