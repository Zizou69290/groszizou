const { put } = require("@vercel/blob");
const { requireAuth } = require("./_lib/auth");

function sanitizeName(name) {
  return String(name || "media.bin")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!requireAuth(req, res)) return;

  const payload = req.body || {};
  const dataUrl = payload.dataUrl;
  const filename = sanitizeName(payload.filename);
  const contentType = payload.contentType || "application/octet-stream";

  if (!dataUrl || !String(dataUrl).startsWith("data:")) {
    res.status(400).json({ error: "Invalid dataUrl" });
    return;
  }

  const base64 = String(dataUrl).split(",")[1] || "";
  if (!base64) {
    res.status(400).json({ error: "Invalid base64 payload" });
    return;
  }

  const buffer = Buffer.from(base64, "base64");
  const pathname = `reviews/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false
  });

  res.status(200).json({ url: blob.url });
};
