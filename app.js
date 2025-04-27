const WORKER_ENDPOINT = "https://appsearch-proxy.mikephiemy.workers.dev/"; // 修改成你的 Worker 地址

const DEFAULT_UA = "AppStore/3.0 iOS/17.0.1 model/iPhone14,2 hw/iPhone";
const searchBtn = document.getElementById('searchBtn');
const input = document.getElementById('queryInput');
const resultArea = document.getElementById('resultArea');
const uaSection = document.getElementById('uaSection');
const uaText = document.getElementById('uaText');
const copyUaBtn = document.getElementById('copyUaBtn');

function showLoading(isLoading) {
  searchBtn.disabled = isLoading;
  searchBtn.textContent = isLoading ? "查询中..." : "查询";
}

function showError(message) {
  resultArea.innerHTML = `<div class="error">${message}</div>`;
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(`已复制: ${text}`);
  });
}

function showResult(appData, productIds) {
  resultArea.innerHTML = `
    <div class="card">
      <h2>${appData.name}</h2>
      <p><strong>App ID:</strong> ${appData.appId}</p>
      <p><strong>Bundle ID:</strong> ${appData.bundleId}</p>
      <h3>订阅商品 (Product IDs):</h3>
      ${productIds.map((pid, index) => `
        <div class="product-item">
          ${index + 1}. ${pid}
          <button class="copy-btn" onclick="copyText('${pid}')">复制</button>
        </div>
      `).join('')}
    </div>
  `;
}

async function searchApp() {
  const query = input.value.trim();
  if (!query) {
    alert('请输入要查询的内容');
    return;
  }

  showLoading(true);
  resultArea.innerHTML = "";
  uaSection.style.display = "none";

  // 解析 App ID
  let appId = "";

  if (/^\d+$/.test(query)) {
    appId = query;
  } else if (query.includes("apps.apple.com")) {
    const match = query.match(/\/id(\d+)/);
    if (match) {
      appId = match[1];
    }
  } else {
    // 名称查询（简单版，后期可以加搜索）
    alert('请输入 App Store链接 或 App ID！');
    showLoading(false);
    return;
  }

  try {
    const res = await fetch(`${WORKER_ENDPOINT}?id=${appId}`);
    const data = await res.json();

    if (!data.data) {
      showError('未找到应用或无法获取ProductID。');
    } else {
      const appData = {
        name: data.data.name,
        appId: data.data.id,
        bundleId: data.data.bundleId
      };
      const productIds = (data.data.subscriptionGroup || [])
        .flatMap(group => group.products || [])
        .map(p => p.productId);

      if (productIds.length === 0) {
        showError('应用没有订阅商品。');
      } else {
        showResult(appData, productIds);
      }

      // 展示 UA
      uaSection.style.display = "block";
      uaText.textContent = DEFAULT_UA;
    }
  } catch (err) {
    console.error(err);
    showError('查询失败，请稍后再试。');
  }
  showLoading(false);
}

searchBtn.addEventListener('click', searchApp);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchApp();
});
copyUaBtn.addEventListener('click', () => {
  copyText(DEFAULT_UA);
});