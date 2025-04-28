export default {
  async fetch(request) {
    const url = new URL(request.url);
    const appId = url.searchParams.get('id');
    
    if (!appId) {
      return new Response(JSON.stringify({ error: "Missing app ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiUrl = `https://itunes.apple.com/lookup?id=${appId}`;

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "iTunes/12.10.1 (Macintosh; OS X 10.15.1) AppleWebKit/605.1.15",
        },
        cf: {
          cacheEverything: false,
          disableCache: true,
        }
      });

      if (!response.ok) {
        throw new Error(`Upstream API error: ${response.status}`);
      }

      const data = await response.json();

      return new Response(JSON.stringify({
        appId: appId,
        bundleId: data.results?.[0]?.bundleId || null,
        appName: data.results?.[0]?.trackName || null,
        productIds: data.results?.[0]?.inAppPurchases || []
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: "Fetch failed", message: error.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
};