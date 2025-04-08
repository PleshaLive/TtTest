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
      const data = dataArray[0]; // берём первый элемент
  
      // Вспомогательная функция для выбора значения из блока UPCOM, если оно есть,
      // или из FINISHED, если в UPCOM пусто
      const chooseValue = (upcom, finished) =>
        (upcom !== "" && upcom !== undefined && upcom !== null)
          ? upcom : finished;
      
      // Обновляем поля: если данные из UPCOM пусты, подставляем значения из FINISHED
      document.getElementById(`team1WinPoints${matchId}`).value =
        chooseValue(data.UPCOM.TEAM1.winPoints, data.FINISHED.TEAM1.winPoints);
      document.getElementById(`team1LosePoints${matchId}`).value =
        chooseValue(data.UPCOM.TEAM1.losePoints, data.FINISHED.TEAM1.losePoints);
      document.getElementById(`team1Rank${matchId}`).value =
        chooseValue(data.UPCOM.TEAM1.rank, data.FINISHED.TEAM1.rank);
      document.getElementById(`team1CurrentPoints${matchId}`).value =
        chooseValue(data.UPCOM.TEAM1.currentPoints, data.FINISHED.TEAM1.currentPoints_win);
  
      document.getElementById(`team2WinPoints${matchId}`).value =
        chooseValue(data.UPCOM.TEAM2.winPoints, data.FINISHED.TEAM2.winPoints);
      document.getElementById(`team2LosePoints${matchId}`).value =
        chooseValue(data.UPCOM.TEAM2.losePoints, data.FINISHED.TEAM2.losePoints);
      document.getElementById(`team2Rank${matchId}`).value =
        chooseValue(data.UPCOM.TEAM2.rank, data.FINISHED.TEAM2.rank);
      document.getElementById(`team2CurrentPoints${matchId}`).value =
        chooseValue(data.UPCOM.TEAM2.currentPoints, data.FINISHED.TEAM2.currentPoints_win);
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