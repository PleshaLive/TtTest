// public/js/vrs.js

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
        console.log(`vrsBlock${i} создан, team1WinPoints${i}:`, document.getElementById(`team1WinPoints${i}`));
      }
    }
  }
  
  export async function loadAllVRS() {
    for (let i = 1; i <= 4; i++) {
      await loadVRSData(i);
    }
  }
  
  
  async function loadVRSData(matchId) {
    try {
      const res = await fetch(`/api/vrs/${matchId}`);
      if (!res.ok) return;
      const dataArray = await res.json();
      if (!Array.isArray(dataArray) || dataArray.length === 0) return;
      const data = dataArray[0]; // первый объект
  
      // Если статус матча FINISHED, берем данные из FINISHED, иначе — из UPCOM
      const sourceTeam1 = data.FINISHED.TEAM1.winPoints !== "" ? data.FINISHED.TEAM1 : data.UPCOM.TEAM1;
      const sourceTeam2 = data.FINISHED.TEAM2.winPoints !== "" ? data.FINISHED.TEAM2 : data.UPCOM.TEAM2;
  
      document.getElementById(`team1WinPoints${matchId}`).value = sourceTeam1.winPoints;
      document.getElementById(`team1LosePoints${matchId}`).value = sourceTeam1.losePoints;
      document.getElementById(`team1Rank${matchId}`).value = sourceTeam1.rank;
      document.getElementById(`team1CurrentPoints${matchId}`).value = sourceTeam1.currentPoints_win || sourceTeam1.currentPoints;
  
      document.getElementById(`team2WinPoints${matchId}`).value = sourceTeam2.winPoints;
      document.getElementById(`team2LosePoints${matchId}`).value = sourceTeam2.losePoints;
      document.getElementById(`team2Rank${matchId}`).value = sourceTeam2.rank;
      document.getElementById(`team2CurrentPoints${matchId}`).value = sourceTeam2.currentPoints_win || sourceTeam2.currentPoints;
    } catch (error) {
      console.error("Ошибка загрузки VRS для матча", matchId, error);
    }
  }
  
  
  
  
  
  
  export function gatherVRSData() {
    const vrsData = {};
    for (let i = 1; i <= 4; i++) {
      vrsData[i] = {
        TEAM1: {
          winPoints: parseInt(document.getElementById(`team1WinPoints${i}`).value, 10),
          losePoints: parseInt(document.getElementById(`team1LosePoints${i}`).value, 10),
          rank: parseInt(document.getElementById(`team1Rank${i}`).value, 10),
          currentPoints: parseInt(document.getElementById(`team1CurrentPoints${i}`).value, 10)
        },
        TEAM2: {
          winPoints: parseInt(document.getElementById(`team2WinPoints${i}`).value, 10),
          losePoints: parseInt(document.getElementById(`team2LosePoints${i}`).value, 10),
          rank: parseInt(document.getElementById(`team2Rank${i}`).value, 10),
          currentPoints: parseInt(document.getElementById(`team2CurrentPoints${i}`).value, 10)
        }
      };
    }
    return vrsData;
  }