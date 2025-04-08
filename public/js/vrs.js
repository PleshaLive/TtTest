// public/js/vrs.js

export function initVRS() {
  // Инициализация блоков VRS для каждого матча
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

export async function loadAllVRS() {
  for (let i = 1; i <= 4; i++) {
    console.log(`Loading VRS for match ${i}`);
    await loadVRSData(i);
  }
}

async function loadVRSData(matchId) {
  try {
    console.log(`Requesting /api/vrs/${matchId}`);
    const res = await fetch(`/api/vrs/${matchId}`);
    if (!res.ok) {
      console.warn(`Response not OK for match ${matchId}:`, res.status);
      return;
    }
    let data = await res.json();
    console.log(`Data received for match ${matchId}:`, data);
    if (Array.isArray(data)) {
      data = data[0];
    }
    // Обновляем поля VRS для данного матча
    document.getElementById(`team1WinPoints${matchId}`).value = data.TEAM1.winPoints;
    document.getElementById(`team1LosePoints${matchId}`).value = data.TEAM1.losePoints;
    document.getElementById(`team1Rank${matchId}`).value = data.TEAM1.rank;
    document.getElementById(`team1CurrentPoints${matchId}`).value = data.TEAM1.currentPoints;
  
    document.getElementById(`team2WinPoints${matchId}`).value = data.TEAM2.winPoints;
    document.getElementById(`team2LosePoints${matchId}`).value = data.TEAM2.losePoints;
    document.getElementById(`team2Rank${matchId}`).value = data.TEAM2.rank;
    document.getElementById(`team2CurrentPoints${matchId}`).value = data.TEAM2.currentPoints;
  } catch (error) {
    console.error("Ошибка загрузки VRS для матча", matchId, error);
  }
}
  
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
