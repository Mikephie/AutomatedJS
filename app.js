const searchBtn = document.getElementById('searchBtn');
const input = document.getElementById('queryInput');
const resultArea = document.getElementById('resultArea');

function showLoading(isLoading) {
  searchBtn.disabled = isLoading;
  searchBtn.textContent = isLoading ? "查询中..." : "查询";
}

function showError(message) {
  resultArea.innerHTML = `<div class="error">${message}</div>`;
}

function showResult(data) {
  const app = data.results[0];
  if (!app) {
    showError('未找到相关应用。');
    return;
  }
  const appHtml = `
    <div class="card">
      <h2>${app.trackName}</h2>
      <p><strong>App ID:</strong> ${app.trackId}</p>
      <p><strong>Bundle ID:</strong> ${app.bundleId}</p>
      <p><strong>App Store Link:</strong> <a href="${app.trackViewUrl}" target="_blank">点击打开</a></p>
    </div>
  `;
  resultArea.innerHTML = appHtml;
}

async function searchApp() {
  const query = input.value.trim();
  if (!query) {
    alert('请输入要查询的内容');
    return;
  }
  showLoading(true);
  resultArea.innerHTML = "";

  let url = "";
  if (/^\d+$/.test(query)) {
    url = `https://itunes.apple.com/lookup?id=${query}`;
  } else if (query.includes("apps.apple.com")) {
    const match = query.match(/\/id(\d+)/);
    if (match) {
      url = `https://itunes.apple.com/lookup?id=${match[1]}`;
    }
  } else {
    url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&limit=1`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.resultCount === 0) {
      showError('没有找到对应应用。');
    } else {
      showResult(data);
    }
  } catch (err) {
    showError('查询失败，请稍后再试。');
  }
  showLoading(false);
}

searchBtn.addEventListener('click', searchApp);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchApp();
});