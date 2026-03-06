export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    return res.status(200).send("OK");
  }

  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(405).send("Method Not Allowed");
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).send("DISCORD_WEBHOOK_URL non configuré");
  }

  try {
    const { imageBase64, content } = req.body || {};
    if (!imageBase64) throw new Error("imageBase64 manquant");

    const cleaned = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleaned, "base64");

    const form = new FormData();
    form.append("file", new Blob([buffer]), "duel-top5.png");
    form.append(
      "payload_json",
      JSON.stringify({ content: content || "Résultats du duel" })
    );

    const resp = await fetch(webhookUrl, { method: "POST", body: form });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Discord ${resp.status}: ${txt}`);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).send("ok");
  } catch (err) {
    console.error(err);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).send(err.message || "Erreur serveur");
  }
}
