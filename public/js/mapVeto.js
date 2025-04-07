// public/js/mapVeto.js

// Инициализация селекта выбора матча
export function initMapVeto() {
  const matchSelect = document.getElementById("matchSelect");
  if (!matchSelect) return;

  // Заполняем опциями матчами 1–4
  for (let i = 1; i <= 4; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Match ${i}`;
    matchSelect.appendChild(opt);
  }

  // Значение по умолчанию — первый матч
  matchSelect.value = "1";

  // (Необязательно) логируем смену матча
  matchSelect.addEventListener("change", () => {
    console.log("Map Veto: выбран матч", matchSelect.value);
  });

  console.log("Map Veto инициализирован");
}

// Сбор данных Map Veto, лого берутся прямо из селектов team1SelectN / team2SelectN
export function gatherMapVetoData(/* matchesData */) {
  // Номер выбранного в UI матча
  const matchIndex = parseInt(document.getElementById("matchSelect").value, 10);

  // Селекты команд в этом матче
  const sel1 = document.getElementById(`team1Select${matchIndex}`);
  const sel2 = document.getElementById(`team2Select${matchIndex}`);

  // Имя и лого из data‑атрибута option
  const team1Name = sel1 ? sel1.value : "TEAM1";
  const team2Name = sel2 ? sel2.value : "TEAM2";
  const team1Logo = sel1 ? sel1.options[sel1.selectedIndex].dataset.logo : "";
  const team2Logo = sel2 ? sel2.options[sel2.selectedIndex].dataset.logo : "";

  // Проходим по всем строкам veto‑таблицы
  const rows = document.querySelectorAll("#vetoTable tbody tr");
  const vetoArr = [];

  rows.forEach(row => {
    const i       = parseInt(row.dataset.index, 10);
    const action  = row.querySelector(".veto-action").value;
    const teamKey = row.querySelector(".veto-team").value; // "TEAM1" или "TEAM2"
    const mapName = row.querySelector(".veto-map").value;
    const side    = row.querySelector(".veto-side").value;

    // Подставляем реальные имя и лого
    const realTeamName = teamKey === "TEAM1" ? team1Name : team2Name;
    const realTeamLogo = teamKey === "TEAM1" ? team1Logo : team2Logo;

    vetoArr.push({
      mapIndex:  i,
      action,
      team:      teamKey,
      teamName:  realTeamName,
      teamLogo:  realTeamLogo,
      map:       mapName,
      side
    });
  });

  return {
    matchIndex,
    teams: {
      TEAM1: { name: team1Name, logo: team1Logo },
      TEAM2: { name: team2Name, logo: team2Logo }
    },
    veto: vetoArr
  };
}
