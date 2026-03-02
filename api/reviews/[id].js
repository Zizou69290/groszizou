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
  const id = req.query.id;

  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  if (req.method === "GET") {
    const result = await pool.query(
      `
      SELECT id, title, category, review_date, score, cover, accent, summary, body, tags, media
      FROM reviews
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (!result.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.status(200).json(toReview(result.rows[0]));
    return;
  }

  if (req.method === "PUT") {
    if (!requireAuth(req, res)) return;
    const review = req.body || {};

    await pool.query(
      `
      UPDATE reviews
      SET title = $2,
          category = $3,
          review_date = $4,
          score = $5,
          cover = $6,
          accent = $7,
          summary = $8,
          body = $9,
          tags = $10::jsonb,
          media = $11::jsonb,
          updated_at = NOW()
      WHERE id = $1
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

    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === "DELETE") {
    if (!requireAuth(req, res)) return;
    await pool.query("DELETE FROM reviews WHERE id = $1", [id]);
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader("Allow", "GET, PUT, DELETE");
  res.status(405).json({ error: "Method not allowed" });
};
