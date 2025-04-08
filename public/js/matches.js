// public/js/matches.js

// Инициализация матчей: загружает список команд, заполняет селекты, привязывает обработчики и загружает сохранённое состояние
export function initMatches() {
  fetch("/api/teams")
    .then(res => res.json())
    .then(data => {
      const teamsList = data.teams || data;
      populateTeamSelects(teamsList);
      attachTeamLogoUpdates();
      attachWinnerButtons();
      attachStatusColorUpdates();
      // Обновляем кнопки-победителя для каждого матча
      for (let m = 1; m <= 4; m++) {
        updateWinnerButtonLabels(m);
        refreshWinnerHighlight(m);
      }
    })
    .catch(err => console.error("Ошибка загрузки /api/teams:", err));
  loadState();         // Загрузка сохранённого локально состояния
  bindSaveListeners(); // Привязка автосохранения локального состояния
  window.addEventListener("beforeunload", saveState);
}

// Заполнение селектов командами
export function populateTeamSelects(teamsList) {
  for (let m = 1; m <= 4; m++) {
    const sel1 = document.getElementById("team1Select" + m);
    const sel2 = document.getElementById("team2Select" + m);
    if (!sel1 || !sel2) continue;
    sel1.innerHTML = "";
    sel2.innerHTML = "";
    teamsList.forEach(team => {
      const opt1 = document.createElement("option");
      opt1.value = team.name;
      opt1.textContent = team.name;
      opt1.dataset.logo = "C:\\projects\\vMix_score\\public" + team.logo;
      sel1.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = team.name;
      opt2.textContent = team.name;
      opt2.dataset.logo = "C:\\projects\\vMix_score\\public" + team.logo;
      sel2.appendChild(opt2);
    });
  }
}

// Обновление логотипов при изменении селектов
export function attachTeamLogoUpdates() {
  for (let m = 1; m <= 4; m++) {
    const sel1 = document.getElementById("team1Select" + m);
    const sel2 = document.getElementById("team2Select" + m);
    if (!sel1 || !sel2) continue;
    sel1.addEventListener("change", () => {
      updateTeamLogoPreview(m, 1);
      updateWinnerButtonLabels(m);
    });
    sel2.addEventListener("change", () => {
      updateTeamLogoPreview(m, 2);
      updateWinnerButtonLabels(m);
    });
    updateTeamLogoPreview(m, 1);
    updateTeamLogoPreview(m, 2);
  }
}

export function updateTeamLogoPreview(matchIndex, teamIndex) {
  const sel = document.getElementById(`team${teamIndex}Select${matchIndex}`);
  const preview = document.getElementById(`team${teamIndex}LogoPreview${matchIndex}`);
  if (!sel || !preview) return;
  const logo = sel.options[sel.selectedIndex].dataset.logo || "";
  preview.src = logo;
}

// Обработчики кнопок-победителя
export function attachWinnerButtons() {
  document.querySelectorAll(".winner-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const matchColumn = btn.closest(".match-column");
      const team = btn.getAttribute("data-team");
      const matchIndex = parseInt(matchColumn.dataset.match, 10);
      matchColumn.setAttribute("data-winner", team);
      updateWinnerButtonLabels(matchIndex);
      refreshWinnerHighlight(matchIndex);
    });
  });
}

export function updateWinnerButtonLabels(matchIndex) {
  const sel1 = document.getElementById(`team1Select${matchIndex}`);
  const sel2 = document.getElementById(`team2Select${matchIndex}`);
  const name1 = sel1 ? sel1.value : "Team1";
  const name2 = sel2 ? sel2.value : "Team2";
  const matchColumn = document.querySelector(`.match-column[data-match="${matchIndex}"]`);
  if (!matchColumn) return;
  const btn1 = matchColumn.querySelector('.winner-btn[data-team="TEAM1"]');
  const btn2 = matchColumn.querySelector('.winner-btn[data-team="TEAM2"]');
  if (btn1) btn1.textContent = `Winner: ${name1}`;
  if (btn2) btn2.textContent = `Winner: ${name2}`;
}

export function refreshWinnerHighlight(matchIndex) {
  const matchColumn = document.querySelector(`.match-column[data-match="${matchIndex}"]`);
  if (!matchColumn) return;
  const winner = matchColumn.getAttribute("data-winner");
  matchColumn.querySelectorAll(".winner-btn").forEach(b => {
    b.classList.toggle("winner-selected", b.getAttribute("data-team") === winner);
  });
}

// Окрашивание статуса селекта
function attachStatusColorUpdates() {
  for (let m = 1; m <= 4; m++) {
    const sel = document.getElementById("statusSelect" + m);
    if (!sel) continue;
    sel.addEventListener("change", () => updateStatusColor(sel));
    updateStatusColor(sel);
  }
}
export function updateStatusColor(sel) {
  const v = sel.value.toUpperCase();
  let color;
  switch (v) {
    case "UPCOM":    color = "#746EC8"; break;
    case "LIVE":     color = "#C45052"; break;
    case "FINISHED": color = "#535353"; break;
    default:         color = "#444";
  }
  sel.style.backgroundColor = color;
  sel.style.color = "#fff";
}

// Сохранение состояния интерфейса в localStorage (локально)
function saveState() {
  const state = [];
  for (let m = 1; m <= 4; m++) {
    const col = document.querySelector(`.match-column[data-match="${m}"]`);
    const maps = Array.from(col.querySelectorAll(".map-row")).map(row => ({
      name: row.querySelector(".map-name-select").value,
      score: row.querySelector(".map-score-input").value.trim()
    }));
    const vrsInputs = Array.from(document.querySelectorAll(`#vrsBlock${m} .vrs-input`)).map(i => i.value.trim());
    const vetoRow = Array.from(document.querySelectorAll(`#vetoTable tr[data-index]`)).map(tr => ({
      action: tr.querySelector(".veto-action").value,
      map: tr.querySelector(".veto-map").value,
      team: tr.querySelector(".veto-team").value,
      side: tr.querySelector(".veto-side").value
    }));
    state.push({
      status: document.getElementById("statusSelect" + m).value,
      time: document.getElementById("timeInput" + m).value.trim(),
      team1: document.getElementById("team1Select" + m).value,
      team2: document.getElementById("team2Select" + m).value,
      winner: col.getAttribute("data-winner") || "",
      maps,
      vrs: vrsInputs,
      veto: vetoRow
    });
  }
  localStorage.setItem("matchesState", JSON.stringify(state));
}

function loadState() {
  const str = localStorage.getItem("matchesState");
  if (!str) return;
  let state;
  try { state = JSON.parse(str); } catch { return; }
  state.forEach((mState, i) => {
    const m = i + 1;
    const col = document.querySelector(`.match-column[data-match="${m}"]`);
    document.getElementById("statusSelect" + m).value = mState.status;
    document.getElementById("timeInput" + m).value = mState.time;
    document.getElementById("team1Select" + m).value = mState.team1;
    document.getElementById("team2Select" + m).value = mState.team2;
    col.setAttribute("data-winner", mState.winner);
    col.querySelectorAll(".map-row").forEach((row, j) => {
      row.querySelector(".map-name-select").value = mState.maps[j]?.name || "";
      row.querySelector(".map-score-input").value = mState.maps[j]?.score || "";
    });
    const vrsInputs = document.querySelectorAll(`#vrsBlock${m} .vrs-input`);
    mState.vrs?.forEach((val, idx) => {
      if (vrsInputs[idx]) vrsInputs[idx].value = val;
    });
    const vetoRows = document.querySelectorAll(`#vetoTable tr[data-index]`);
    mState.veto?.forEach((v, idx) => {
      const tr = vetoRows[idx];
      if (!tr) return;
      tr.querySelector(".veto-action").value = v.action;
      tr.querySelector(".veto-map").value = v.map;
      tr.querySelector(".veto-team").value = v.team;
      tr.querySelector(".veto-side").value = v.side;
    });
    updateStatusColor(document.getElementById("statusSelect" + m));
    updateWinnerButtonLabels(m);
    refreshWinnerHighlight(m);
    updateTeamLogoPreview(m, 1);
    updateTeamLogoPreview(m, 2);
  });
}

function bindSaveListeners() {
  document.querySelectorAll("select, input").forEach(el => {
    el.addEventListener("change", saveState);
  });
  document.querySelectorAll(".winner-btn").forEach(btn => {
    btn.addEventListener("click", saveState);
  });
  document.querySelectorAll(".vrs-input").forEach(i => {
    i.addEventListener("change", saveState);
  });
  document.querySelectorAll(".veto-action, .veto-map, .veto-team, .veto-side")
    .forEach(s => s.addEventListener("change", saveState));
}

export function loadStateAndBind() {
  loadState();
  bindSaveListeners();
}
