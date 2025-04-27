const WORKER_ENDPOINT = "https://appsearch-proxy.mikephiemy.workers.dev"; // 记得改成你的 Cloudflare Worker 地址！

const DEFAULT_UA = "AppStore/3.0 iOS/17.0.1 model/iPhone14,2 hw/iPhone";
const searchBtn = document.getElementById('searchBtn');
const input = document.getElementById('queryInput');
const resultArea = document.getElementById('resultArea');
const uaSection = document.getElementById('uaSection');
const uaText = document.getElementById('uaText');
const copyUaBtn = document.getElementById('copyUaBtn');
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');

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

async function queryProductIds(appId) {
  try {
    const res = await fetch(`${WORKER_ENDPOINT}?id=${appId}`);
    const data = await res.json();

    if (!data.data) {
      showError('未找到应用或无法获取ProductID。');
      return;
    }

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

    uaSection.style.display = "block";
    uaText.textContent = DEFAULT_UA;

  } catch (err) {
    console.error(err);
    showError('查询失败，请稍后再试。');
  }
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

  let appId = "";

  // 判断输入类型
  if (/^\d+$/.test(query)) {
    appId = query;
    await queryProductIds(appId);
  } else if (query.includes("apps.apple.com")) {
    const match = query.match(/\/id(\d+)/);
    if (match) {
      appId = match[1];
      await queryProductIds(appId);
    } else {
      showError('无法解析 App Store链接');
    }
  } else if (query.startsWith("com.")) {
    // Bundle ID 查找
    try {
      const res = await fetch(`https://itunes.apple.com/lookup?bundleId=${query}`);
      const data = await res.json();
      if (data.resultCount === 0) {
        showError('未找到对应Bundle ID。');
      } else {
        appId = data.results[0].trackId;
        await queryProductIds(appId);
      }
    } catch (err) {
      console.error(err);
      showError('查询失败，请稍后再试。');
    }
  } else {
    // 名称搜索
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&limit=10`);
      const data = await res.json();
      if (data.resultCount === 0) {
        showError('未找到相关应用。');
      } else {
        showAppSelectModal(data.results);
      }
    } catch (err) {
      console.error(err);
      showError('查询失败，请稍后再试。');
    }
  }

  showLoading(false);
}

function showAppSelectModal(apps) {
  modalContent.innerHTML = `
    <h2>请选择要查询的App</h2>
    ${apps.map(app => `
      <div class="app-select-item" onclick="selectApp('${app.trackId}')">
        <img src="${app.artworkUrl60}" alt="${app.trackName}" />
        <div>
          <strong>${app.trackName}</strong><br/>
          App ID: ${app.trackId}
        </div>
      </div>
    `).join('')}
  `;
  modal.style.display = "flex";
}

async function selectApp(appId) {
  modal.style.display = "none";
  showLoading(true);
  await queryProductIds(appId);
  showLoading(false);
}

searchBtn.addEventListener('click', searchApp);
input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchApp();
});
copyUaBtn.addEventListener('click', () => {
  copyText(DEFAULT_UA);
});

// 点击弹窗外关闭
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};