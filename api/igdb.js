const IGDB_BASE_URL = "https://api.igdb.com/v4";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const TOKEN_EXPIRY_SAFETY_MS = 60 * 1000;

let cachedToken = "";
let cachedTokenExpiry = 0;

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

function escapeApicalypseSearch(text) {
  return String(text || "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function imageUrlFromId(imageId, size = "t_cover_big") {
  if (!imageId) return "";
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

function yearFromUnixTimestamp(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  const date = new Date(parsed * 1000);
  return String(date.getUTCFullYear());
}

function pickStudioName(game) {
  const companies = Array.isArray(game?.involved_companies) ? game.involved_companies : [];
  const developer = companies.find((entry) => entry?.developer && entry?.company?.name);
  if (developer?.company?.name) return String(developer.company.name).trim();
  const publisher = companies.find((entry) => entry?.publisher && entry?.company?.name);
  if (publisher?.company?.name) return String(publisher.company.name).trim();
  const firstNamed = companies.find((entry) => entry?.company?.name);
  return firstNamed?.company?.name ? String(firstNamed.company.name).trim() : "";
}

function normalizeGame(game) {
  const coverImageId = game?.cover?.image_id || "";
  const artworkImageId = Array.isArray(game?.artworks) ? game.artworks.find((entry) => entry?.image_id)?.image_id || "" : "";
  const screenshotImageId = Array.isArray(game?.screenshots) ? game.screenshots.find((entry) => entry?.image_id)?.image_id || "" : "";
  const cover = artworkImageId
    ? imageUrlFromId(artworkImageId, "t_1080p")
    : screenshotImageId
      ? imageUrlFromId(screenshotImageId, "t_1080p")
      : coverImageId
        ? imageUrlFromId(coverImageId, "t_1080p")
        : "";

  return {
    id: Number(game?.id) || 0,
    mediaType: "igdb_game",
    title: String(game?.name || "").trim(),
    year: yearFromUnixTimestamp(game?.first_release_date),
    poster: coverImageId ? imageUrlFromId(coverImageId, "t_cover_big") : "",
    cover,
    overview: String(game?.summary || "").trim(),
    studio: pickStudioName(game)
  };
}

function uniqueList(values = []) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

async function fetchTwitchAccessToken(clientId, clientSecret) {
  const now = Date.now();
  if (cachedToken && cachedTokenExpiry - TOKEN_EXPIRY_SAFETY_MS > now) return cachedToken;

  const url = `${TWITCH_TOKEN_URL}?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`;
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) throw new Error("Unable to retrieve Twitch token");
  const json = await response.json();
  const accessToken = String(json?.access_token || "").trim();
  const expiresIn = Number(json?.expires_in);
  if (!accessToken || !Number.isFinite(expiresIn)) throw new Error("Invalid Twitch token response");

  cachedToken = accessToken;
  cachedTokenExpiry = now + expiresIn * 1000;
  return cachedToken;
}

async function igdbQuery(path, body, clientId, accessToken) {
  const response = await fetch(`${IGDB_BASE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain"
    },
    body
  });
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`IGDB query failed (${response.status}) ${errorText}`.trim());
  }
  return response.json();
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).send("OK");
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const clientId = String(process.env.IGDB_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.IGDB_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "IGDB credentials missing on server" });
  }

  const mode = String(req.query.mode || "search").trim().toLowerCase();
  try {
    const token = await fetchTwitchAccessToken(clientId, clientSecret);

    if (mode === "search") {
      const query = String(req.query.q || "").trim();
      const limitRaw = Number(req.query.limit);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(12, Math.floor(limitRaw))) : 8;
      if (query.length < 2) return res.status(200).json({ results: [] });
      const body = [
        `search "${escapeApicalypseSearch(query)}";`,
        "fields name,summary,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,involved_companies.company.name,involved_companies.developer,involved_companies.publisher;",
        `limit ${limit};`
      ].join(" ");
      const rows = await igdbQuery("games", body, clientId, token);
      return res.status(200).json({ results: rows.map(normalizeGame).filter((entry) => entry.id && entry.title) });
    }

    if (mode === "details") {
      const id = Number(req.query.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid game id" });
      const body = [
        "fields name,summary,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,involved_companies.company.name,involved_companies.developer,involved_companies.publisher;",
        `where id = ${Math.floor(id)};`,
        "limit 1;"
      ].join(" ");
      const rows = await igdbQuery("games", body, clientId, token);
      const game = rows[0];
      return res.status(200).json({ details: game ? normalizeGame(game) : {} });
    }

    if (mode === "images") {
      const id = Number(req.query.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "Invalid game id" });
      const body = [
        "fields cover.image_id,artworks.image_id,screenshots.image_id;",
        `where id = ${Math.floor(id)};`,
        "limit 1;"
      ].join(" ");
      const rows = await igdbQuery("games", body, clientId, token);
      const game = rows[0] || {};
      const coverImageId = game?.cover?.image_id || "";
      const artworks = Array.isArray(game?.artworks) ? game.artworks : [];
      const screenshots = Array.isArray(game?.screenshots) ? game.screenshots : [];
      const posters = uniqueList([
        coverImageId ? imageUrlFromId(coverImageId, "t_cover_big") : "",
        ...artworks.map((entry) => imageUrlFromId(entry?.image_id, "t_cover_big"))
      ]);
      const backdrops = uniqueList([
        ...artworks.map((entry) => imageUrlFromId(entry?.image_id, "t_1080p")),
        ...screenshots.map((entry) => imageUrlFromId(entry?.image_id, "t_1080p")),
        coverImageId ? imageUrlFromId(coverImageId, "t_1080p") : ""
      ]);
      return res.status(200).json({ images: { posters, backdrops } });
    }

    return res.status(400).json({ error: "Unsupported mode" });
  } catch (error) {
    console.error("igdb api error", error);
    return res.status(500).json({ error: "IGDB request failed" });
  }
}
