function isAuthorized(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    throw new Error("Missing ADMIN_TOKEN");
  }

  const header = req.headers["x-admin-token"] || req.headers["X-Admin-Token"];
  return header && header === expected;
}

function requireAuth(req, res) {
  try {
    if (!isAuthorized(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
    return true;
  } catch (error) {
    res.status(500).json({ error: error.message || "Auth error" });
    return false;
  }
}

module.exports = { requireAuth };
