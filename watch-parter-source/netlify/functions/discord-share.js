export async function handler(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "Method Not Allowed",
    };
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "DISCORD_WEBHOOK_URL non configuré",
    };
  }

  try {
    const { imageBase64, content } = JSON.parse(event.body || "{}");
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

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: "ok",
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: err.message || "Erreur serveur",
    };
  }
}
