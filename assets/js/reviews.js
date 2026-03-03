window.ReviewsStore = (() => {
  const categories = {
    jeu: "Jeu-vidéo",
    film: "Film",
    serie: "Série",
    musique: "Musique",
    livre: "Livre",
    autre: "Autre"
  };

  const reviewCollection = "reviews";
  const topCollection = "tops";
  let firebaseReady = false;
  let db;
  let auth;
  let cfg;

  function ensureFirebase() {
    if (firebaseReady) return;

    if (!window.firebase) {
      throw new Error("Firebase SDK non chargé");
    }

    cfg = window.GROSZIZOU_FIREBASE_CONFIG || {};
    if (!cfg.apiKey || !cfg.projectId) {
      throw new Error("Config Firebase manquante (assets/js/firebase-config.js)");
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }

    db = firebase.firestore();
    auth = firebase.auth();
    firebaseReady = true;
  }

  function slugify(value) {
    const result = String(value || "item")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return result || `${Date.now()}`;
  }

  function normalizeBlock(raw) {
    if (!raw || !raw.type) return null;
    const normalized = {
      type: raw.type,
      content: raw.content || "",
      url: raw.url || "",
      caption: raw.caption || ""
    };
    if ("url2" in raw) normalized.url2 = raw.url2 || "";
    if ("caption2" in raw) normalized.caption2 = raw.caption2 || "";
    return normalized;
  }

  function normalizeReview(review) {
    const blocks = Array.isArray(review.blocks)
      ? review.blocks.map(normalizeBlock).filter(Boolean)
      : [];

    return {
      id: review.id || slugify(review.title),
      title: review.title || "Sans titre",
      category: review.category || "jeu",
      date: review.date || "",
      score: Number.isFinite(Number(review.score)) ? Number(review.score) : null,
      cover: review.cover || "",
      poster: review.poster || "",
      accent: review.accent || "",
      summary: review.summary || "",
      author: review.author || "",
      director: review.director || "",
      studio: review.studio || "",
      releaseYear: review.releaseYear || "",
      genre: review.genre || "",
      blocks,
      updatedAt: typeof review.updatedAt === "number" ? review.updatedAt : Date.now()
    };
  }

  function normalizeTopItem(item) {
    if (!item) return null;
    const title = item.title || "";
    const reviewId = item.reviewId || "";
    if (!title && !reviewId) return null;
    return {
      title,
      comment: item.comment || "",
      reviewId
    };
  }

  function normalizeTop(top) {
    const items = Array.isArray(top.items)
      ? top.items.map(normalizeTopItem).filter(Boolean)
      : [];

    return {
      id: top.id || slugify(top.title),
      title: top.title || "Sans titre",
      subtitle: top.subtitle || "",
      category: top.category || "autre",
      year: top.year || "",
      items,
      updatedAt: typeof top.updatedAt === "number" ? top.updatedAt : Date.now()
    };
  }

  function requireAuth() {
    ensureFirebase();
    if (!auth.currentUser) {
      throw new Error("Mot de passe requis pour modifier");
    }
  }

  async function getAll() {
    ensureFirebase();
    const snap = await db.collection(reviewCollection).orderBy("updatedAt", "desc").get();
    return snap.docs.map((doc) => normalizeReview({ id: doc.id, ...doc.data() }));
  }

  async function getById(id) {
    ensureFirebase();
    const doc = await db.collection(reviewCollection).doc(id).get();
    if (!doc.exists) throw new Error("Not found");
    return normalizeReview({ id: doc.id, ...doc.data() });
  }

  async function upsert(review) {
    requireAuth();
    const normalized = normalizeReview(review);
    await db.collection(reviewCollection).doc(normalized.id).set(normalized, { merge: true });
    return { ok: true, id: normalized.id };
  }

  async function remove(id) {
    requireAuth();
    await db.collection(reviewCollection).doc(id).delete();
    return { ok: true };
  }

  async function getAllTops() {
    ensureFirebase();
    const snap = await db.collection(topCollection).orderBy("updatedAt", "desc").get();
    return snap.docs.map((doc) => normalizeTop({ id: doc.id, ...doc.data() }));
  }

  async function getTopById(id) {
    ensureFirebase();
    const doc = await db.collection(topCollection).doc(id).get();
    if (!doc.exists) throw new Error("Not found");
    return normalizeTop({ id: doc.id, ...doc.data() });
  }

  async function upsertTop(top) {
    requireAuth();
    const normalized = normalizeTop(top);
    await db.collection(topCollection).doc(normalized.id).set(normalized, { merge: true });
    return { ok: true, id: normalized.id };
  }

  async function removeTop(id) {
    requireAuth();
    await db.collection(topCollection).doc(id).delete();
    return { ok: true };
  }

  async function exportJson() {
    const all = await getAll();
    return JSON.stringify(all, null, 2);
  }

  async function importJson(text) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("JSON must be an array");
    requireAuth();

    let count = 0;
    for (const item of parsed) {
      await upsert(item);
      count += 1;
    }
    return count;
  }

  async function unlockWithPassword(password) {
    ensureFirebase();
    if (!cfg.adminEmail) {
      throw new Error("Renseigne adminEmail dans assets/js/firebase-config.js");
    }
    return auth.signInWithEmailAndPassword(cfg.adminEmail, password);
  }

  async function signOut() {
    ensureFirebase();
    return auth.signOut();
  }

  function onAuthChanged(callback) {
    ensureFirebase();
    return auth.onAuthStateChanged(callback);
  }

  return {
    categories,
    slugify,
    getAll,
    getById,
    upsert,
    remove,
    getAllTops,
    getTopById,
    upsertTop,
    removeTop,
    exportJson,
    importJson,
    unlockWithPassword,
    signOut,
    onAuthChanged
  };
})();
