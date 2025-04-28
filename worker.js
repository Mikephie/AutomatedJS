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

    const apiUrl = `https://api.appsearch.apple.com/v1/app/detail?id=${appId}`;

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "User-Agent": "AppStore/3.0 iOS/17.0.1 model/iPhone14,2 hw/iPhone",
          "X-Device-Id": crypto.randomUUID(),  // 动态生成设备ID
          "Accept": "application/json",
          "Accept-Language": "en-US",
          "Connection": "keep-alive",
          "X-FaceTime-Device-Id": crypto.randomUUID() // 补充 FaceTime ID，更像真机
        },
        cf: {
          cacheEverything: false,
          disableCache: true,
        }
      });

      if (!response.ok) {
        throw new Error(`Upstream API error: ${response.status}`);
      }

      const result = await response.text();
      return new Response(result, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // 网页端可以直接连
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