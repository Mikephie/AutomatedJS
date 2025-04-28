// api.js - Vercel Serverless Function
export default async function handler(request, response) {
  const { query } = request;
  const appId = query.id;

  if (!appId) {
    return response.status(400).json({ error: "Missing app ID" });
  }

  const apiUrl = `https://itunes.apple.com/lookup?id=${appId}`;

  try {
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "iTunes/12.10.1 (Macintosh; OS X 10.15.1) AppleWebKit/605.1.15",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive"
      }
    });

    if (!res.ok) {
      throw new Error(`Upstream API error: ${res.status}`);
    }

    const data = await res.json();

    return response.status(200).json({
      appId: data.results?.[0]?.trackId || null,
      bundleId: data.results?.[0]?.bundleId || null,
      appName: data.results?.[0]?.trackName || null,
      productIds: data.results?.[0]?.inAppPurchases || []
    });

  } catch (error) {
    return response.status(502).json({ error: "Fetch failed", message: error.message });
  }
}