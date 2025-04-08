// public/js/vrs.js

// Инициализация блоков VRS для каждого матча
export function initVRS() {
  for (let i = 1; i <= 4; i++) {
    const vrsBlock = document.getElementById("vrsBlock" + i);
    if (vrsBlock) {
      vrsBlock.innerHTML = `
          <h3>VRS</h3>
          <table class="vrs-table">
            <thead>
              <tr>
                <th>TEAM</th>
                <th>+P</th>
                <th>-P</th>
                <th>#</th>
                <th>CUR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td id="vrsTeam1Name${i}">TEAM1</td>
                <td><input type="text" id="team1WinPoints${i}" value="35" /></td>
                <td><input type="text" id="team1LosePoints${i}" value="-35" /></td>
                <td><input type="text" id="team1Rank${i}" value="4" /></td>
                <td><input type="text" id="team1CurrentPoints${i}" value="84" /></td>
              </tr>
              <tr>
                <td id="vrsTeam2Name${i}">TEAM2</td>
                <td><input type="text" id="team2WinPoints${i}" value="35" /></td>
                <td><input type="text" id="team2LosePoints${i}" value="-35" /></td>
                <td><input type="text" id="team2Rank${i}" value="2" /></td>
                <td><input type="text" id="team2CurrentPoints${i}" value="80" /></td>
              </tr>
            </tbody>
          </table>
      `;
    }
  }
}
  
// Функция для загрузки данных VRS для каждого матча
async function loadVRSData(matchId) {
  try {
    // Здесь формируем URL вида /api/vrs1, /api/vrs2 и т.д.
    const res = await fetch(`/api/vrs${matchId}`);
    if (!res.ok) return;
    const data = await res.json();
    // Обновляем поля VRS для данного матча
    // Предполагается, что сервер возвращает массив, где данные по VRS находятся в data[0]
    document.getElementById(`team1WinPoints${matchId}`).value = data[0].UPCOM.TEAM1.winPoints;
    document.getElementById(`team1LosePoints${matchId}`).value = data[0].UPCOM.TEAM1.losePoints;
    document.getElementById(`team1Rank${matchId}`).value = data[0].UPCOM.TEAM1.rank;
    document.getElementById(`team1CurrentPoints${matchId}`).value = data[0].UPCOM.TEAM1.currentPoints;
    
    document.getElementById(`team2WinPoints${matchId}`).value = data[0].UPCOM.TEAM2.winPoints;
    document.getElementById(`team2LosePoints${matchId}`).value = data[0].UPCOM.TEAM2.losePoints;
    document.getElementById(`team2Rank${matchId}`).value = data[0].UPCOM.TEAM2.rank;
    document.getElementById(`team2CurrentPoints${matchId}`).value = data[0].UPCOM.TEAM2.currentPoints;
  } catch (error) {
    console.error("Ошибка загрузки VRS для матча", matchId, error);
  }
}
  
// Функция для загрузки данных VRS для всех матчей
export async function loadAllVRS() {
  for (let i = 1; i <= 4; i++) {
    await loadVRSData(i);
  }
}
  
// Функция для сбора данных VRS с формы
export function gatherVRSData() {
  const vrsData = {};
  for (let i = 1; i <= 4; i++) {
    vrsData[i] = {
      TEAM1: {
        winPoints: parseInt(document.getElementById(`team1WinPoints${i}`).value, 10) || 0,
        losePoints: parseInt(document.getElementById(`team1LosePoints${i}`).value, 10) || 0,
        rank: parseInt(document.getElementById(`team1Rank${i}`).value, 10) || 0,
        currentPoints: parseInt(document.getElementById(`team1CurrentPoints${i}`).value, 10) || 0
      },
      TEAM2: {
        winPoints: parseInt(document.getElementById(`team2WinPoints${i}`).value, 10) || 0,
        losePoints: parseInt(document.getElementById(`team2LosePoints${i}`).value, 10) || 0,
        rank: parseInt(document.getElementById(`team2Rank${i}`).value, 10) || 0,
        currentPoints: parseInt(document.getElementById(`team2CurrentPoints${i}`).value, 10) || 0
      }
    };
  }
  return vrsData;
}
  
export { loadAllVRS };
