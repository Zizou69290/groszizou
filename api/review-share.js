const FIREBASE_PROJECT_ID = "groszizou-835bc";
const FIREBASE_API_KEY = "AIzaSyCrkNYXRPas9KT6CXJr4mNJMfHFJVISoG0";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decodeFirestoreValue(node) {
  if (!node || typeof node !== "object") return null;
  if ("stringValue" in node) return String(node.stringValue || "");
  if ("integerValue" in node) return Number(node.integerValue);
  if ("doubleValue" in node) return Number(node.doubleValue);
  if ("booleanValue" in node) return Boolean(node.booleanValue);
  if ("nullValue" in node) return null;
  if ("timestampValue" in node) return String(node.timestampValue || "");
  if ("arrayValue" in node) {
    const values = Array.isArray(node.arrayValue?.values) ? node.arrayValue.values : [];
    return values.map((entry) => decodeFirestoreValue(entry));
  }
  if ("mapValue" in node) {
    const fields = node.mapValue?.fields || {};
    const out = {};
    Object.entries(fields).forEach(([key, value]) => {
      out[key] = decodeFirestoreValue(value);
    });
    return out;
  }
  return null;
}

function getOrigin(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || "https";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!host) return "https://example.com";
  return `${protocol}://${host}`;
}

function safeImageUrl(raw, fallback) {
  const value = String(raw || "").trim();
  if (!value) return fallback;
  if (value.startsWith("data:")) return fallback;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch {
    return fallback;
  }
  return fallback;
}

async function fetchReviewForShare(reviewId) {
  if (!reviewId) return null;
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIREBASE_PROJECT_ID)}` +
    `/databases/(default)/documents/reviews/${encodeURIComponent(reviewId)}?key=${encodeURIComponent(FIREBASE_API_KEY)}`;
  const response = await fetch(endpoint);
  if (!response.ok) return null;
  const doc = await response.json();
  const fields = doc?.fields || {};
  return {
    id: reviewId,
    title: String(decodeFirestoreValue(fields.title) || "").trim(),
    summary: String(decodeFirestoreValue(fields.summary) || "").trim(),
    cover: String(decodeFirestoreValue(fields.cover) || "").trim()
  };
}

module.exports = async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  const origin = getOrigin(req);
  const reviewUrl = `${origin}/review.html?id=${encodeURIComponent(id)}`;
  const shareUrl = `${origin}/api/review-share?id=${encodeURIComponent(id)}`;
  const fallbackImage = `${origin}/pouce.png`;

  let review = null;
  try {
    review = await fetchReviewForShare(id);
  } catch {
    review = null;
  }

  const title = review?.title || "SuperSite - Review";
  const description = review?.summary || "Ouvre la review sur SuperSite.";
  const imageUrl = safeImageUrl(review?.cover, fallbackImage);

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="SuperSite" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
  <style>
    html, body { margin: 0; height: 100%; background: #0d1820; }
    .share-shell { width: 100%; height: 100%; display: grid; }
    iframe { width: 100%; height: 100%; border: 0; }
    .fallback { position: fixed; top: 8px; right: 10px; z-index: 10; font: 14px/1.2 system-ui, sans-serif; background: rgba(0,0,0,.45); color: #fff; padding: 6px 10px; border-radius: 8px; }
    .fallback a { color: #fff; }
  </style>
</head>
<body>
  <div class="share-shell">
    <iframe src="${escapeHtml(reviewUrl)}" title="${escapeHtml(title)}" loading="eager"></iframe>
  </div>
  <p class="fallback">Ouvrir sans wrapper: <a href="${escapeHtml(reviewUrl)}">review.html</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.status(200).send(html);
};
