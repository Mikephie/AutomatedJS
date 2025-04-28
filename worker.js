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
          "X-Device-Id": crypto.randomUUID(),
        },
      });
      const text = await response.text();
      return new Response(text, { headers: { "Content-Type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Fetch failed", message: error.message }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};