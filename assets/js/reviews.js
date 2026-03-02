window.ReviewsStore = (() => {
  const categories = {
    jeu: "Jeu video",
    film: "Film",
    serie: "Serie",
    musique: "Musique",
    livre: "Livre"
  };

  const adminTokenKey = "groszizou_admin_token";

  function slugify(value) {
    const result = String(value || "review")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return result || `review-${Date.now()}`;
  }

  function getAdminToken() {
    return localStorage.getItem(adminTokenKey) || "";
  }

  function setAdminToken(token) {
    if (!token) {
      localStorage.removeItem(adminTokenKey);
      return;
    }
    localStorage.setItem(adminTokenKey, token);
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const payload = await response.json();
        if (payload?.error) message = payload.error;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    return response.json();
  }

  async function getAll() {
    return request("/api/reviews");
  }

  async function getById(id) {
    return request(`/api/reviews/${encodeURIComponent(id)}`);
  }

  async function upsert(review) {
    const token = getAdminToken();
    if (!token) throw new Error("Missing admin token");

    return request("/api/reviews", {
      method: "POST",
      headers: { "x-admin-token": token },
      body: JSON.stringify(review)
    });
  }

  async function remove(id) {
    const token = getAdminToken();
    if (!token) throw new Error("Missing admin token");

    return request(`/api/reviews/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "x-admin-token": token }
    });
  }

  async function exportJson() {
    const all = await getAll();
    return JSON.stringify(all, null, 2);
  }

  async function importJson(text) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("JSON must be an array");

    let count = 0;
    for (const item of parsed) {
      const review = {
        id: item.id || slugify(item.title),
        title: item.title || "Sans titre",
        category: item.category || "jeu",
        date: item.date || "",
        score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
        cover: item.cover || "",
        accent: item.accent || "",
        summary: item.summary || "",
        body: item.body || "",
        tags: Array.isArray(item.tags) ? item.tags : [],
        media: Array.isArray(item.media) ? item.media : []
      };
      await upsert(review);
      count += 1;
    }

    return count;
  }

  async function uploadFile(file) {
    const token = getAdminToken();
    if (!token) throw new Error("Missing admin token");

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("File read failed"));
      reader.readAsDataURL(file);
    });

    const payload = await request("/api/upload", {
      method: "POST",
      headers: { "x-admin-token": token },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        dataUrl
      })
    });

    return payload.url;
  }

  return {
    categories,
    slugify,
    getAll,
    getById,
    upsert,
    remove,
    exportJson,
    importJson,
    uploadFile,
    getAdminToken,
    setAdminToken
  };
})();
