// クエリパラメータ取得
function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

// "HH:mm" → 分数（数値）に変換
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// 現在時刻（分単位）を取得
function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// 徒歩・自転車の到着可能性を判定
function judgeArrival(timeMinutes, nowMinutes, walkTime, bikeTime) {
  const minutesLeft = timeMinutes - nowMinutes;

  let walkMark = "×";
  let bikeMark = "×";

  if (minutesLeft >= walkTime + 5) walkMark = "〇";
  else if (minutesLeft >= walkTime) walkMark = "△";

  if (minutesLeft >= bikeTime + 3) bikeMark = "〇";
  else if (minutesLeft >= bikeTime) bikeMark = "△";

  return { walk: walkMark, bike: bikeMark };
}

// 英語→日本語の方向マッピング
const directionMap = {
  up: "上り",
  down: "下り",
  extra: "長野電鉄"
};

// 平日・休日の判定
const dayType = getQueryParam("day") || "weekday";
const jsonFile = dayType === "holiday" ? "station_schedule_holiday.json" : "station_schedule.json";

// メイン処理：データ取得＆表示
fetch(jsonFile)
  .then(res => res.json())
  .then(data => {
    const stationName = getQueryParam("station");
    const dirKey = getQueryParam("direction");
    const direction = directionMap[dirKey];

    if (!direction) {
      document.getElementById("nextDeparture").textContent = "方向が不明です。";
      return;
    }

    // タイトルは固定で「検索結果」だけ表示
    document.getElementById("title").textContent = "検索結果";

    const station = data.stops.find(s => s.name === stationName);
    if (!station) {
      document.getElementById("nextDeparture").textContent = "駅データが見つかりません。";
      return;
    }

    const departures = station.departures[direction] || [];
    const now = getCurrentTimeMinutes();

    // 駅ごとの所要時間（デフォルトあり）
    const walkTime = station.access?.walk ?? 10;
    const bikeTime = station.access?.bike ?? 5;

    // 次の3件だけ取得
    const upcoming = departures
      .filter(d => timeToMinutes(d.time) > now)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))
      .slice(0, 3);

    const container = document.getElementById("nextDeparture");
    container.innerHTML = "";

    if (upcoming.length > 0) {
      upcoming.forEach(dep => {
        const div = document.createElement("div");
        div.className = "departureCard";

        const depTimeMin = timeToMinutes(dep.time);
        const { walk, bike } = judgeArrival(depTimeMin, now, walkTime, bikeTime);

        // 改行して2行表示（リンクではなくテキスト）
        div.innerHTML = `
        <span class="depTime">${dep.time}</span> ${dep.type || ""} ${dep.destination} 行<br>
        <small>徒歩：${walk}　自転車：${bike}</small>
        `;


        container.appendChild(div);
      });
    } else {
      const div = document.createElement("div");
      div.className = "departureCard";
      div.textContent = `本日の運転は終了しました。`;
      container.appendChild(div);
    }
  })
  .catch(error => {
    console.error("読み込みエラー:", error);
    document.getElementById("nextDeparture").textContent = "データの読み込みに失敗しました。";
  });
