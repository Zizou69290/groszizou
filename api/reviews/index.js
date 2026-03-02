const { getPool } = require("../_lib/db");
const { requireAuth } = require("../_lib/auth");

function toReview(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    date: row.review_date || "",
    score: row.score === null ? null : Number(row.score),
    cover: row.cover || "",
    accent: row.accent || "",
    summary: row.summary || "",
    body: row.body || "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    media: Array.isArray(row.media) ? row.media : []
  };
}

module.exports = async function handler(req, res) {
  const pool = getPool();

  if (req.method === "GET") {
    const result = await pool.query(
      `
      SELECT id, title, category, review_date, score, cover, accent, summary, body, tags, media
      FROM reviews
      ORDER BY COALESCE(review_date, CURRENT_DATE) DESC, updated_at DESC
      `
    );

    res.status(200).json(result.rows.map(toReview));
    return;
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res)) return;

    const review = req.body || {};
    const id = String(review.id || "").trim();
    if (!id) {
      res.status(400).json({ error: "Missing id" });
      return;
    }

    await pool.query(
      `
      INSERT INTO reviews (id, title, category, review_date, score, cover, accent, summary, body, tags, media)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        review_date = EXCLUDED.review_date,
        score = EXCLUDED.score,
        cover = EXCLUDED.cover,
        accent = EXCLUDED.accent,
        summary = EXCLUDED.summary,
        body = EXCLUDED.body,
        tags = EXCLUDED.tags,
        media = EXCLUDED.media,
        updated_at = NOW()
      `,
      [
        id,
        review.title || "Sans titre",
        review.category || "jeu",
        review.date || null,
        Number.isFinite(Number(review.score)) ? Number(review.score) : null,
        review.cover || "",
        review.accent || "",
        review.summary || "",
        review.body || "",
        JSON.stringify(Array.isArray(review.tags) ? review.tags : []),
        JSON.stringify(Array.isArray(review.media) ? review.media : [])
      ]
    );

    res.status(200).json({ ok: true, id });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
};
