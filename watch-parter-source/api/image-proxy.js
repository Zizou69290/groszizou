export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    return res.status(200).send("OK");
  }
  if (req.method !== "GET") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(405).send("Method Not Allowed");
  }

  const url = req.query.url;
  if (!url) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(400).send("Missing url");
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(502).send(`Upstream ${response.status}`);
    }
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).json({ dataUrl });
  } catch (e) {
    console.error("proxy error", e);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).send("Proxy error");
  }
}
