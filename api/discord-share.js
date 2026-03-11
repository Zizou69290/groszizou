function normalizeShareKind(value) {
  return String(value || "").trim().toLowerCase() === "top" ? "top" : "review";
}

function safeHttpUrl(raw) {
  const value = String(raw || "").trim();
  if (!value || value.startsWith("data:")) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch {
    return "";
  }
  return "";
}

function buildEmbedPayload(body = {}) {
  const kind = normalizeShareKind(body.kind);
  const title = String(body.title || "Sans titre").trim() || "Sans titre";
  const summary = String(body.summary || "").trim();
  const link = safeHttpUrl(body.url);
  const coverUrl = safeHttpUrl(body.coverUrl);
  const year = String(body.year || "").trim();
  const director = String(body.director || "").trim();
  const scoreNum = Number(body.score);
  const score = Number.isFinite(scoreNum) ? `${scoreNum.toFixed(1)}/10` : "";

  const fields = [];
  if (year) {
    fields.push({
      name: "Année",
      value: year,
      inline: true
    });
  }
  if (director) {
    fields.push({
      name: "Réalisateur",
      value: director,
      inline: true
    });
  }
  if (score) {
    fields.push({
      name: kind === "top" ? "Note moyenne" : "Note",
      value: score,
      inline: true
    });
  }

  const embed = {
    title,
    description: summary || (kind === "top" ? "Nouveau top publié sur SuperSite." : "Nouvelle review publiée sur SuperSite."),
    color: kind === "top" ? 0xf7b538 : 0xf25f29
  };

  if (link) embed.url = link;
  if (coverUrl) embed.image = { url: coverUrl };
  if (fields.length) embed.fields = fields;

  return {
    username: "SuperSite",
    content: "Super review en ligne 👍",
    embeds: [embed]
  };
}

export default async function handler(req, res) {
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

  try {
    const { imageBase64, content } = req.body || {};
    const duelWebhookUrl = process.env.DISCORD_WEBHOOK_URL_DUEL || process.env.DISCORD_WEBHOOK_URL;
    const contentWebhookUrl = process.env.DISCORD_WEBHOOK_URL_CONTENT || process.env.DISCORD_WEBHOOK_URL;
    let resp;

    // Backward compatibility for duel image posting flow.
    if (imageBase64) {
      if (!duelWebhookUrl) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(500).send("DISCORD_WEBHOOK_URL_DUEL is not configured");
      }
      const cleaned = String(imageBase64).replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(cleaned, "base64");

      const form = new FormData();
      form.append("file", new Blob([buffer]), "duel-top5.png");
      form.append("payload_json", JSON.stringify({ content: content || "Resultats du duel" }));
      resp = await fetch(duelWebhookUrl, { method: "POST", body: form });
    } else {
      if (!contentWebhookUrl) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return res.status(500).send("DISCORD_WEBHOOK_URL_CONTENT is not configured");
      }
      const payload = buildEmbedPayload(req.body || {});
      resp = await fetch(contentWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Discord ${resp.status}: ${txt}`);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).send("ok");
  } catch (error) {
    console.error(error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).send(error?.message || "Server error");
  }
}
