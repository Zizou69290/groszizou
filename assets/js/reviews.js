window.ReviewsStore = (() => {
  const categories = {
    jeu: "Jeu-vidéo",
    film: "Film",
    serie: "Série",
    musique: "Musique",
    livre: "Livre"
  };

  const collectionName = "reviews";
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
    const result = String(value || "review")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return result || `review-${Date.now()}`;
  }

  function normalizeBlock(raw) {
    if (!raw || !raw.type) return null;
    const block = {
      type: raw.type,
      content: raw.content || "",
      url: raw.url || "",
      caption: raw.caption || ""
    };
    return block;
  }

  function normalize(review) {
    let blocks = Array.isArray(review.blocks)
      ? review.blocks.map(normalizeBlock).filter(Boolean)
      : [];

    if (!blocks.length) {
      if (review.body) {
        blocks.push({ type: "text", content: review.body, url: "", caption: "" });
      }
      if (Array.isArray(review.media)) {
        review.media.forEach((m) => {
          if (m?.type && m?.url) {
            blocks.push({ type: m.type, content: "", url: m.url, caption: m.caption || "" });
          }
        });
      }
    }

    return {
      id: review.id || slugify(review.title),
      title: review.title || "Sans titre",
      category: review.category || "jeu",
      date: review.date || "",
      score: Number.isFinite(Number(review.score)) ? Number(review.score) : null,
      cover: review.cover || "",
      accent: review.accent || "",
      summary: review.summary || "",
      blocks,
      updatedAt: typeof review.updatedAt === "number" ? review.updatedAt : Date.now()
    };
  }

  async function getAll() {
    ensureFirebase();
    const snap = await db.collection(collectionName).orderBy("updatedAt", "desc").get();
    return snap.docs.map((doc) => normalize({ id: doc.id, ...doc.data() }));
  }

  async function getById(id) {
    ensureFirebase();
    const doc = await db.collection(collectionName).doc(id).get();
    if (!doc.exists) throw new Error("Not found");
    return normalize({ id: doc.id, ...doc.data() });
  }

  function requireAuth() {
    ensureFirebase();
    if (!auth.currentUser) {
      throw new Error("Mot de passe requis pour modifier");
    }
  }

  async function upsert(review) {
    requireAuth();
    const normalized = normalize(review);
    await db.collection(collectionName).doc(normalized.id).set(normalized, { merge: true });
    return { ok: true, id: normalized.id };
  }

  async function remove(id) {
    requireAuth();
    await db.collection(collectionName).doc(id).delete();
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
    exportJson,
    importJson,
    unlockWithPassword,
    signOut,
    onAuthChanged
  };
})();
